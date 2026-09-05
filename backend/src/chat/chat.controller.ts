import { Controller, Get, Param, Query } from '@nestjs/common';
import { ChatService } from './chat.service.js';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  async getConversations(
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string
  ) {
    if (!userId) {
      return { conversations: [], total: 0, hasMore: false };
    }
    return this.chatService.getUserConversations(
      userId,
      limit ? parseInt(limit, 10) : 20,
      page ? parseInt(page, 10) : 1
    );
  }

  @Get('rooms/:roomId/messages')
  async getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const messages = await this.chatService.getMessagesByRoom(
      roomId,
      parsedLimit,
      cursor
    );
    return messages.map((msg) => ({
      id: msg._id.toString(),
      roomId: msg.roomId,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      text: msg.text,
      createdAt: (msg as any).createdAt,
    }));
  }
}
