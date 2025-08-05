import { type User, type InsertUser, type Room, type InsertRoom, type Message, type InsertMessage, type MessageWithUser, type RoomWithMessageCount } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: string, status: string): Promise<User | undefined>;
  getOnlineUsers(): Promise<User[]>;

  // Rooms
  getRoom(id: string): Promise<Room | undefined>;
  getRoomByName(name: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  getAllRooms(): Promise<RoomWithMessageCount[]>;
  incrementRoomMessageCount(roomId: string): Promise<void>;

  // Messages
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByRoom(roomId: string, limit?: number): Promise<MessageWithUser[]>;
  getAllMessages(): Promise<MessageWithUser[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private rooms: Map<string, Room>;
  private messages: Map<string, Message>;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.messages = new Map();
    
    // Initialize default rooms
    this.initializeDefaultRooms();
  }

  private async initializeDefaultRooms() {
    const defaultRooms = [
      { name: "genel-sohbet", description: "Herkesin konuşabileceği genel alan" },
      { name: "random", description: "Rastgele konuşmalar için" },
      { name: "oyun", description: "Oyun konuşmaları" },
      { name: "müzik", description: "Müzik paylaşımları" },
    ];

    for (const roomData of defaultRooms) {
      const id = randomUUID();
      const room: Room = {
        id,
        name: roomData.name,
        description: roomData.description,
        messageCount: 0,
      };
      this.rooms.set(id, room);
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id,
      username: insertUser.username,
      profileImage: insertUser.profileImage || null,
      status: insertUser.status || "online",
      lastSeen: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserStatus(id: string, status: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, status, lastSeen: new Date() };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async getOnlineUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.status === "online");
  }

  // Rooms
  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async getRoomByName(name: string): Promise<Room | undefined> {
    return Array.from(this.rooms.values()).find(room => room.name === name);
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = randomUUID();
    const room: Room = { 
      id, 
      name: insertRoom.name,
      description: insertRoom.description || null,
      messageCount: 0 
    };
    this.rooms.set(id, room);
    return room;
  }

  async getAllRooms(): Promise<RoomWithMessageCount[]> {
    return Array.from(this.rooms.values()).map(room => ({
      ...room,
      messageCount: Array.from(this.messages.values()).filter(msg => msg.roomId === room.id).length,
    }));
  }

  async incrementRoomMessageCount(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      const updatedRoom = { ...room, messageCount: (room.messageCount || 0) + 1 };
      this.rooms.set(roomId, updatedRoom);
    }
  }

  // Messages
  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      id,
      roomId: insertMessage.roomId,
      userId: insertMessage.userId,
      content: insertMessage.content || null,
      messageType: insertMessage.messageType || "text",
      fileName: insertMessage.fileName || null,
      filePath: insertMessage.filePath || null,
      fileSize: insertMessage.fileSize || null,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    await this.incrementRoomMessageCount(insertMessage.roomId);
    return message;
  }

  async getMessagesByRoom(roomId: string, limit = 50): Promise<MessageWithUser[]> {
    const roomMessages = Array.from(this.messages.values())
      .filter(msg => msg.roomId === roomId)
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0))
      .slice(-limit);

    const messagesWithUsers: MessageWithUser[] = [];
    for (const message of roomMessages) {
      const user = this.users.get(message.userId);
      if (user) {
        messagesWithUsers.push({ ...message, user });
      }
    }
    return messagesWithUsers;
  }

  async getAllMessages(): Promise<MessageWithUser[]> {
    const allMessages = Array.from(this.messages.values())
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));

    const messagesWithUsers: MessageWithUser[] = [];
    for (const message of allMessages) {
      const user = this.users.get(message.userId);
      if (user) {
        messagesWithUsers.push({ ...message, user });
      }
    }
    return messagesWithUsers;
  }
}

export const storage = new MemStorage();
