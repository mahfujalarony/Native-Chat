import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service.js';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    client.join(roomId);
    client.emit('joinedRoom', roomId);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody()
    data: {
      roomId: string;
      senderId: string;
      receiverId: string;
      text: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const savedMessage = await this.chatService.createMessage({
      roomId: data.roomId,
      senderId: data.senderId,
      receiverId: data.receiverId,
      text: data.text,
    });

    const payload = {
      id: savedMessage._id.toString(),
      roomId: savedMessage.roomId,
      senderId: savedMessage.senderId,
      receiverId: savedMessage.receiverId,
      text: savedMessage.text,
      createdAt: (savedMessage as any).createdAt,
    };

    this.server.to(data.roomId).emit('receiveMessage', payload);
  }
}
