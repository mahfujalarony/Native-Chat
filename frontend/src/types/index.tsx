export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
}

export interface Message {
  id: string;
  roomId?: string;
  senderId: string;
  receiverId?: string;
  text: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface ChatRoom {
  id: string;
  name?: string;
  lastMessage?: string;
  status: 'pending' | 'delivered' | 'read' | 'failed';
  updatedAt: string;
}

export interface Conversation {
  roomId: string;
  user: User;
  lastMessage: {
    id: string;
    text: string;
    senderId: string;
    createdAt: string;
  };
}

