import { type User, type InsertUser, type Room, type InsertRoom, type Message, type InsertMessage, type MessageWithUser, type RoomWithMessageCount, type TypingIndicator } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Typing indicators
  setTyping(userId: string, roomId: string, username: string): Promise<void>;
  clearTyping(userId: string, roomId: string): Promise<void>;
  getTypingUsers(roomId: string): Promise<TypingIndicator[]>;
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: string, status: string): Promise<User | undefined>;
  updateUserProfile(id: string, username: string, profileImage?: string): Promise<User | undefined>;
  banUser(id: string, bannedUntil: Date | null): Promise<User | undefined>;
  getOnlineUsers(): Promise<User[]>;
  getOfflineUsers(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<boolean>;

  // Rooms
  getRoom(id: string): Promise<Room | undefined>;
  getRoomByName(name: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  getAllRooms(): Promise<RoomWithMessageCount[]>;
  incrementRoomMessageCount(roomId: string): Promise<void>;
  deleteRoom(id: string): Promise<boolean>;
  updateRoomName(id: string, name: string): Promise<boolean>;

  // Messages
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, content: string): Promise<Message | undefined>;
  updateMessagePollVotes(id: string, pollVotes: Record<number, number>): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;
  getMessagesByRoom(roomId: string, limit?: number): Promise<MessageWithUser[]>;
  getAllMessages(): Promise<MessageWithUser[]>;
  
  // DM functionality
  createDMRoom(user1Id: string, user2Id: string): Promise<Room>;
  getDMRoom(user1Id: string, user2Id: string): Promise<Room | null>;
  getUserDMRooms(userId: string): Promise<Room[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private rooms: Map<string, Room>;
  private messages: Map<string, Message>;
  private typingIndicators: Map<string, TypingIndicator>;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.messages = new Map();
    this.typingIndicators = new Map();
    
    // Initialize default rooms
    this.initializeDefaultRooms();
    
    // Clean up old typing indicators every 10 seconds
    setInterval(() => this.cleanupOldTypingIndicators(), 10000);
  }

  private async initializeDefaultRooms() {
    const defaultRooms = [
      { name: "💬｜sohbet", description: "Genel sohbet kanalı" },
      { name: "😂｜mizah", description: "Komik içerikler ve şakalar" },
      { name: "🎮｜oyunlar", description: "Oyun tartışmaları" },
      { name: "🎵｜müzik", description: "Müzik paylaşımları ve tartışmaları" },
      { name: "🖼️｜medya", description: "Video, resim ve medya paylaşımları" },
      { name: "🎬｜filmler", description: "Film ve dizi konuşmaları" },
    ];

    for (const roomData of defaultRooms) {
      const id = randomUUID();
      const room: Room = {
        id,
        name: roomData.name,
        description: roomData.description,
        messageCount: 0,
        isDM: false,
        participants: null,
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
    const isFirstUser = this.users.size === 0; // İlk kullanıcı otomatik admin olacak
    const user: User = { 
      id,
      username: insertUser.username,
      profileImage: insertUser.profileImage || null,
      status: insertUser.status || "online",
      isAdmin: isFirstUser, // İlk kullanıcı admin
      lastSeen: new Date(),
      bannedUntil: null,
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

  async updateUserProfile(id: string, username: string, profileImage?: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { 
        ...user, 
        username, 
        profileImage: profileImage || user.profileImage,
        lastSeen: new Date() 
      };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async banUser(id: string, bannedUntil: Date | null): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, bannedUntil, lastSeen: new Date() };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async getOnlineUsers(): Promise<User[]> {
    const now = new Date();
    return Array.from(this.users.values()).filter(user => 
      user.status === "online" && 
      (!user.bannedUntil || user.bannedUntil < now)
    );
  }

  async getOfflineUsers(): Promise<User[]> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    return Array.from(this.users.values()).filter(user => {
      // A user is considered offline if:
      // 1. Their status is explicitly "offline", OR
      // 2. They haven't been seen in the last 5 minutes and aren't explicitly "online"
      const isExplicitlyOffline = user.status === "offline";
      const isInactive = user.lastSeen && user.lastSeen < fiveMinutesAgo && user.status !== "online";
      
      return (isExplicitlyOffline || isInactive) && 
        (!user.bannedUntil || user.bannedUntil < now);
    });
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(id: string): Promise<boolean> {
    const deleted = this.users.delete(id);
    if (deleted) {
      // Also delete all messages from this user
      for (const [messageId, message] of Array.from(this.messages.entries())) {
        if (message.userId === id) {
          this.messages.delete(messageId);
        }
      }
    }
    return deleted;
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
      messageCount: 0,
      isDM: false,
      participants: null
    };
    this.rooms.set(id, room);
    return room;
  }

  async getAllRooms(): Promise<RoomWithMessageCount[]> {
    // Only return non-DM rooms for the regular room list
    return Array.from(this.rooms.values())
      .filter(room => !room.isDM)
      .map(room => ({
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

  async updateRoomName(id: string, name: string): Promise<boolean> {
    const room = this.rooms.get(id);
    if (room) {
      const updatedRoom = { ...room, name };
      this.rooms.set(id, updatedRoom);
      return true;
    }
    return false;
  }

  async deleteRoom(id: string): Promise<boolean> {
    const deleted = this.rooms.delete(id);
    if (deleted) {
      // Also delete all messages in this room
      for (const [messageId, message] of Array.from(this.messages.entries())) {
        if (message.roomId === id) {
          this.messages.delete(messageId);
        }
      }
    }
    return deleted;
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
      editedAt: null,
      replyToId: insertMessage.replyToId || null,

      fileGroupId: insertMessage.fileGroupId || null,
      groupIndex: insertMessage.groupIndex || null,
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
        // Check if this message is a reply to another message
        const replyTo = message.replyToId 
          ? roomMessages.find(m => m.id === message.replyToId)
          : undefined;
        
        const messageWithUser: MessageWithUser = {
          ...message,
          user,
          replyTo: replyTo && this.users.get(replyTo.userId) ? {
            ...replyTo,
            user: this.users.get(replyTo.userId)!
          } : undefined
        };
        
        messagesWithUsers.push(messageWithUser);
      }
    }
    return messagesWithUsers;
  }

  async updateMessage(id: string, content: string): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (message) {
      const updatedMessage = { ...message, content, editedAt: new Date() };
      this.messages.set(id, updatedMessage);
      return updatedMessage;
    }
    return undefined;
  }

  async updateMessagePollVotes(id: string, pollVotes: Record<number, number>): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (message) {
      const updatedMessage = { ...message, pollVotes };
      this.messages.set(id, updatedMessage);
      return updatedMessage;
    }
    return undefined;
  }

  async deleteMessage(id: string): Promise<boolean> {
    return this.messages.delete(id);
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



  // Typing indicators
  async setTyping(userId: string, roomId: string, username: string): Promise<void> {
    const key = `${userId}-${roomId}`;
    this.typingIndicators.set(key, {
      userId,
      username,
      roomId,
      timestamp: new Date()
    });
  }

  async clearTyping(userId: string, roomId: string): Promise<void> {
    const key = `${userId}-${roomId}`;
    this.typingIndicators.delete(key);
  }

  async getTypingUsers(roomId: string): Promise<TypingIndicator[]> {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 5000); // 5 seconds ago
    
    return Array.from(this.typingIndicators.values()).filter(indicator => 
      indicator.roomId === roomId && indicator.timestamp > cutoffTime
    );
  }

  private cleanupOldTypingIndicators(): void {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 10000); // 10 seconds ago
    
    Array.from(this.typingIndicators.entries()).forEach(([key, indicator]) => {
      if (indicator.timestamp < cutoffTime) {
        this.typingIndicators.delete(key);
      }
    });
  }

  // DM functionality
  async createDMRoom(user1Id: string, user2Id: string): Promise<Room> {
    const id = randomUUID();
    const user1 = await this.getUser(user1Id);
    const user2 = await this.getUser(user2Id);
    
    if (!user1 || !user2) {
      throw new Error("Kullanıcılar bulunamadı");
    }

    const room: Room = {
      id,
      name: `${user1.username}, ${user2.username}`,
      description: `${user1.username} ve ${user2.username} arasında özel mesajlaşma`,
      messageCount: 0,
      isDM: true,
      participants: [user1Id, user2Id]
    };
    
    this.rooms.set(id, room);
    return room;
  }

  async getDMRoom(user1Id: string, user2Id: string): Promise<Room | null> {
    const rooms = Array.from(this.rooms.values());
    const dmRoom = rooms.find(room => 
      room.isDM && 
      room.participants && 
      room.participants.includes(user1Id) && 
      room.participants.includes(user2Id)
    );
    
    return dmRoom || null;
  }

  async getUserDMRooms(userId: string): Promise<Room[]> {
    const rooms = Array.from(this.rooms.values());
    return rooms.filter(room => 
      room.isDM && 
      room.participants && 
      room.participants.includes(userId)
    );
  }
}

export const storage = new MemStorage();
