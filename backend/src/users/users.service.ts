import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(user: Partial<User>): Promise<UserDocument> {
    const createdUser = new this.userModel(user);
    return createdUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findAll(
    excludeUserId?: string,
    limit: number = 20,
    page: number = 1,
    search?: string,
  ): Promise<{ users: User[]; total: number; hasMore: boolean }> {
    const filter: any = {};
    if (excludeUserId && Types.ObjectId.isValid(excludeUserId)) {
      filter._id = { $ne: new Types.ObjectId(excludeUserId) };
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
      ];
    }

    const parsedLimit = Math.max(1, Number(limit) || 20);
    const parsedPage = Math.max(1, Number(page) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password')
        .sort({ _id: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      users,
      total,
      hasMore: skip + users.length < total,
    };
  }

  async updateProfile(
    id: string,
    data: { name?: string; email?: string; bio?: string; avatar?: string },
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .select('-password')
      .exec();
  }
}