import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema.js';
import { User, UserDocument } from '../users/schemas/user.schema.js';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async createMessage(data: {
    roomId: string;
    senderId: string;
    receiverId: string;
    text: string;
  }): Promise<MessageDocument> {
    const createdMessage = new this.messageModel(data);
    return createdMessage.save();
  }

  async getMessagesByRoom(
    roomId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<MessageDocument[]> {
    const query: any = { roomId };
    if (cursor && Types.ObjectId.isValid(cursor)) {
      query._id = { $lt: new Types.ObjectId(cursor) };
    }

    return this.messageModel
      .find(query)
      .sort({ _id: -1 })
      .limit(Number(limit) || 20)
      .exec();
  }

  async getUserConversations(
    userId: string,
    limit: number = 20,
    page: number = 1,
  ): Promise<{ conversations: any[]; total: number; hasMore: boolean }> {
    const parsedLimit = Math.max(1, Number(limit) || 20);
    const parsedPage = Math.max(1, Number(page) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const pipeline: any[] = [
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $group: {
          _id: '$roomId',
          lastMessage: { $first: '$$ROOT' },
        },
      },
      {
        $sort: { 'lastMessage._id': -1 },
      },
    ];

    const allGrouped = await this.messageModel.aggregate(pipeline).exec();
    const total = allGrouped.length;
    const paginated = allGrouped.slice(skip, skip + parsedLimit);

    const otherUserIds = paginated.map((item) => {
      const msg = item.lastMessage;
      return msg.senderId === userId ? msg.receiverId : msg.senderId;
    });

    const validObjectIds = otherUserIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const users = await this.userModel
      .find({ _id: { $in: validObjectIds } })
      .select('-password')
      .exec();

    const userMap = new Map<string, any>();
    users.forEach((u) => {
      userMap.set(u._id.toString(), u);
    });

    const conversations = paginated.map((item) => {
      const msg = item.lastMessage;
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const otherUser = userMap.get(otherId);

      return {
        roomId: item._id,
        user: {
          id: otherId,
          name: otherUser?.name || 'Anonymous User',
          email: otherUser?.email || '',
          avatar: otherUser?.avatar || '',
        },
        lastMessage: {
          id: msg._id.toString(),
          text: msg.text,
          senderId: msg.senderId,
          createdAt: msg.createdAt,
        },
      };
    });

    return {
      conversations,
      total,
      hasMore: skip + conversations.length < total,
    };
  }
}

