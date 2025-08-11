import { type User, type InsertUser, type Room, type InsertRoom, type Message, type InsertMessage, type MessageWithUser, type RoomWithMessageCount, type TypingIndicator, users, rooms, messages, reactions } from "@shared/schema";
import { randomUUID } from "crypto";
import { botManager } from "./bot-manager";
import { db } from "./db";
import { eq, and, desc, inArray, sql } from "drizzle-orm";

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
  addUserToDMRoom(roomId: string, userId: string): Promise<boolean>;
  removeUserFromDMRoom(roomId: string, userId: string): Promise<boolean>;
  
  // Message cleanup
  deleteOldMessages(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  private typingIndicators: Map<string, TypingIndicator>;

  constructor() {
    this.typingIndicators = new Map();
    
    // Initialize default rooms and NexaBot
    this.initializeDefaults();
    
    // Clean up old typing indicators every 10 seconds
    setInterval(() => this.cleanupOldTypingIndicators(), 10000);
    
    // Clean up old messages every 24 hours
    setInterval(() => this.deleteOldMessages(), 24 * 60 * 60 * 1000);
  }

  private async initializeDefaults() {
    try {
      await this.initializeDefaultRooms();
      await botManager.ensureBotInitialized(() => this.createBotUser());
    } catch (error) {
      console.error("Error initializing defaults:", error);
    }
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
      const existingRoom = await db.select().from(rooms).where(eq(rooms.name, roomData.name)).limit(1);
      if (existingRoom.length === 0) {
        await db.insert(rooms).values({
          name: roomData.name,
          description: roomData.description,
          messageCount: 0,
          isDM: false,
          participants: null,
        });
      }
    }
  }

  private async createBotUser(): Promise<void> {
    // Check if NexaBot already exists
    const existingBot = await db.select().from(users).where(eq(users.username, "NexaBot")).limit(1);
    if (existingBot.length > 0) {
      console.log("DatabaseStorage: NexaBot already exists:", existingBot[0].id);
      return;
    }

    const [bot] = await db.insert(users).values({
      username: "NexaBot",
      profileImage: "https://i.imgur.com/2FDBAwR.png",
      status: "online",
      isAdmin: true,
    }).returning();
    
    console.log("DatabaseStorage: NexaBot user created:", bot.id);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      username: insertUser.username,
      profileImage: insertUser.profileImage || null,
      status: insertUser.status || "online",
      isAdmin: false,
    }).returning();
    return user;
  }

  async updateUserStatus(id: string, status: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ status, lastSeen: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async updateUserProfile(id: string, username: string, profileImage?: string): Promise<User | undefined> {
    const updateData: any = { username, lastSeen: new Date() };
    if (profileImage !== undefined) {
      updateData.profileImage = profileImage;
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async banUser(id: string, bannedUntil: Date | null): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ bannedUntil, lastSeen: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async getOnlineUsers(): Promise<User[]> {
    const now = new Date();
    const onlineUsers = await db.select()
      .from(users)
      .where(
        and(
          eq(users.status, "online"),
          sql`(${users.bannedUntil} IS NULL OR ${users.bannedUntil} < ${now})`
        )
      );
    
    // NexaBot'u her zaman online olarak göster
    const nexaBot = await this.getUserByUsername("NexaBot");
    if (nexaBot && !onlineUsers.find(user => user.username === "NexaBot")) {
      await this.updateUserStatus(nexaBot.id, "online");
      onlineUsers.push({ ...nexaBot, status: "online" });
    }
    
    return onlineUsers;
  }

  async getOfflineUsers(): Promise<User[]> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    return await db.select()
      .from(users)
      .where(
        and(
          sql`(${users.status} = 'offline' OR (${users.lastSeen} < ${fiveMinutesAgo} AND ${users.status} != 'online'))`,
          sql`(${users.bannedUntil} IS NULL OR ${users.bannedUntil} < ${now})`
        )
      );
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Rooms
  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
    return room || undefined;
  }

  async getRoomByName(name: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.name, name)).limit(1);
    return room || undefined;
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const [room] = await db.insert(rooms).values({
      name: insertRoom.name,
      description: insertRoom.description || null,
      messageCount: 0,
      isDM: insertRoom.isDM || false,
      participants: insertRoom.participants || null,
    }).returning();
    return room;
  }

  async getAllRooms(): Promise<RoomWithMessageCount[]> {
    const allRooms = await db.select().from(rooms).where(eq(rooms.isDM, false));
    
    const roomsWithCount: RoomWithMessageCount[] = [];
    for (const room of allRooms) {
      const messageCount = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(eq(messages.roomId, room.id));
      
      roomsWithCount.push({
        ...room,
        messageCount: Number(messageCount[0]?.count || 0),
      });
    }
    
    return roomsWithCount;
  }

  async incrementRoomMessageCount(roomId: string): Promise<void> {
    await db
      .update(rooms)
      .set({ messageCount: sql`${rooms.messageCount} + 1` })
      .where(eq(rooms.id, roomId));
  }

  async updateRoomName(id: string, name: string): Promise<boolean> {
    const result = await db
      .update(rooms)
      .set({ name })
      .where(eq(rooms.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteRoom(id: string): Promise<boolean> {
    const result = await db.delete(rooms).where(eq(rooms.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Messages
  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
    return message || undefined;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values({
      roomId: insertMessage.roomId,
      userId: insertMessage.userId,
      content: insertMessage.content || null,
      messageType: insertMessage.messageType || "text",
      fileName: insertMessage.fileName || null,
      filePath: insertMessage.filePath || null,
      fileSize: insertMessage.fileSize || null,
      replyToId: insertMessage.replyToId || null,
      fileGroupId: insertMessage.fileGroupId || null,
      groupIndex: insertMessage.groupIndex || null,
      attachments: JSON.stringify(insertMessage.attachments || []),
    }).returning();
    
    await this.incrementRoomMessageCount(insertMessage.roomId);
    return message;
  }

  async getMessagesByRoom(roomId: string, limit = 50): Promise<MessageWithUser[]> {
    const roomMessages = await db.select({
      message: messages,
      user: users
    })
    .from(messages)
    .innerJoin(users, eq(messages.userId, users.id))
    .where(eq(messages.roomId, roomId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

    const messagesWithUsers: MessageWithUser[] = roomMessages.reverse().map(({ message, user }) => ({
      ...message,
      user,
    }));

    return messagesWithUsers;
  }

  async updateMessage(id: string, content: string): Promise<Message | undefined> {
    const [updatedMessage] = await db
      .update(messages)
      .set({ content, editedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return updatedMessage || undefined;
  }

  async updateMessagePollVotes(id: string, pollVotes: Record<number, number>): Promise<Message | undefined> {
    // This method is not used anymore since we removed polling, but keeping for interface compatibility
    return undefined;
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getAllMessages(): Promise<MessageWithUser[]> {
    const allMessages = await db.select({
      message: messages,
      user: users
    })
    .from(messages)
    .innerJoin(users, eq(messages.userId, users.id))
    .orderBy(desc(messages.createdAt));

    return allMessages.map(({ message, user }) => ({
      ...message,
      user,
    }));
  }

  // Typing indicators (kept in memory for performance)
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
    const user1 = await this.getUser(user1Id);
    const user2 = await this.getUser(user2Id);
    
    if (!user1 || !user2) {
      throw new Error("Kullanıcılar bulunamadı");
    }

    const [room] = await db.insert(rooms).values({
      name: `${user1.username}, ${user2.username}`,
      description: `${user1.username} ve ${user2.username} arasında özel mesajlaşma`,
      messageCount: 0,
      isDM: true,
      participants: [user1Id, user2Id]
    }).returning();
    
    return room;
  }

  async getDMRoom(user1Id: string, user2Id: string): Promise<Room | null> {
    const dmRooms = await db.select()
      .from(rooms)
      .where(
        and(
          eq(rooms.isDM, true),
          sql`${rooms.participants} @> ARRAY[${user1Id}]::text[]`,
          sql`${rooms.participants} @> ARRAY[${user2Id}]::text[]`
        )
      );
    
    return dmRooms[0] || null;
  }

  async getUserDMRooms(userId: string): Promise<Room[]> {
    return await db.select()
      .from(rooms)
      .where(
        and(
          eq(rooms.isDM, true),
          sql`${rooms.participants} @> ARRAY[${userId}]::text[]`
        )
      );
  }

  async addUserToDMRoom(roomId: string, userId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (room && room.isDM && room.participants) {
      if (!room.participants.includes(userId) && room.participants.length < 4) {
        const result = await db
          .update(rooms)
          .set({ participants: [...room.participants, userId] })
          .where(eq(rooms.id, roomId));
        return result.rowCount !== null && result.rowCount > 0;
      }
    }
    return false;
  }

  async removeUserFromDMRoom(roomId: string, userId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (room && room.isDM && room.participants) {
      const updatedParticipants = room.participants.filter(id => id !== userId);
      const result = await db
        .update(rooms)
        .set({ participants: updatedParticipants })
        .where(eq(rooms.id, roomId));
      return result.rowCount !== null && result.rowCount > 0;
    }
    return false;
  }

  // Message cleanup
  async deleteOldMessages(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await db
      .delete(messages)
      .where(sql`${messages.createdAt} < ${twentyFourHoursAgo}`);
    
    const deletedCount = result.rowCount || 0;
    console.log(`Deleted ${deletedCount} old messages`);
    return deletedCount;
  }
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
    
    // Initialize NexaBot using bot manager to prevent duplicates
    botManager.ensureBotInitialized(() => this.createBotUser());
    
    // Clean up old typing indicators every 10 seconds
    setInterval(() => this.cleanupOldTypingIndicators(), 10000);
    
    // Clean up old messages every 24 hours
    setInterval(() => this.deleteOldMessages(), 24 * 60 * 60 * 1000);
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

  private async createBotUser(): Promise<void> {
    // Check if NexaBot already exists
    const existingBot = Array.from(this.users.values()).find(user => user.username === "NexaBot");
    if (existingBot) {
      console.log("MemStorage: NexaBot already exists:", existingBot.id);
      return;
    }

    const bot: User = {
      id: randomUUID(),
      username: "NexaBot",
      profileImage: "https://i.imgur.com/2FDBAwR.png",
      status: "online",
      isAdmin: true,
      lastSeen: new Date(),
      bannedUntil: null,
    };
    this.users.set(bot.id, bot);
    console.log("MemStorage: NexaBot user created:", bot.id);
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
      isAdmin: false, // Artık admin sistemi yok
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
    const onlineUsers = Array.from(this.users.values()).filter(user => 
      user.status === "online" && 
      (!user.bannedUntil || user.bannedUntil < now)
    );
    
    // NexaBot'u her zaman online olarak göster
    const nexaBot = await this.getUserByUsername("NexaBot");
    if (nexaBot && !onlineUsers.find(user => user.username === "NexaBot")) {
      // NexaBot'u online yap ve listeye ekle
      nexaBot.status = "online";
      this.users.set(nexaBot.id, nexaBot);
      onlineUsers.push(nexaBot);
    }
    
    return onlineUsers;
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
      attachments: "[]", // Default empty attachments array
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

  async addUserToDMRoom(roomId: string, userId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (room && room.isDM && room.participants) {
      if (!room.participants.includes(userId) && room.participants.length < 4) {
        const updatedRoom = { 
          ...room, 
          participants: [...room.participants, userId]
        };
        this.rooms.set(roomId, updatedRoom);
        return true;
      }
    }
    return false;
  }

  async removeUserFromDMRoom(roomId: string, userId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (room && room.isDM && room.participants) {
      const updatedParticipants = room.participants.filter(id => id !== userId);
      if (updatedParticipants.length >= 2) {
        const updatedRoom = { 
          ...room, 
          participants: updatedParticipants
        };
        this.rooms.set(roomId, updatedRoom);
        return true;
      }
    }
    return false;
  }

  async deleteOldMessages(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    for (const [messageId, message] of Array.from(this.messages.entries())) {
      if (message.createdAt && message.createdAt < twentyFourHoursAgo) {
        this.messages.delete(messageId);
        deletedCount++;
      }
    }
    
    console.log(`24 saatlik temizlik: ${deletedCount} mesaj silindi`);
    return deletedCount;
  }
}

export class PostgreSQLStorage implements IStorage {
  private db: any;
  private typingIndicators: Map<string, TypingIndicator>;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    // Database connection to be implemented when PostgreSQL is available
    this.db = null; // TODO: Initialize when database is ready
    this.typingIndicators = new Map();
    
    // Initialize default rooms and bot
    this.initializeDefaultRooms();
    // Use bot manager to prevent duplicates
    botManager.ensureBotInitialized(() => this.createBotUser());
    
    // Clean up old typing indicators every 10 seconds
    setInterval(() => this.cleanupOldTypingIndicators(), 10000);
    
    // Clean up old messages every 24 hours
    setInterval(() => this.deleteOldMessages(), 24 * 60 * 60 * 1000);
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
      const existingRoom = await this.getRoomByName(roomData.name);
      if (!existingRoom) {
        await this.createRoom({
          name: roomData.name,
          description: roomData.description,
          isDM: false,
          participants: []
        });
      }
    }
  }

  private async createBotUser(): Promise<void> {
    try {
      // Check if NexaBot already exists
      const existingBots = await this.db.select().from(users).where(eq(users.username, "NexaBot"));
      
      if (existingBots.length === 0) {
        // Create NexaBot if it doesn't exist
        const botUser = {
          username: "NexaBot",
          profileImage: "https://i.imgur.com/2FDBAwR.png",
          status: "online"
        };
        
        const bot = await this.createUser(botUser);
        console.log("PostgreSQL: NexaBot user created:", bot.id);
      } else if (existingBots.length > 1) {
        // Remove duplicates, keep the first one
        const keepBot = existingBots[0];
        for (let i = 1; i < existingBots.length; i++) {
          await this.db.delete(users).where(eq(users.id, existingBots[i].id));
          console.log(`PostgreSQL: Duplicate NexaBot removed: ${existingBots[i].id}`);
        }
        console.log(`PostgreSQL: Kept original NexaBot: ${keepBot.id}`);
      } else {
        console.log("PostgreSQL: NexaBot already exists:", existingBots[0].id);
      }
    } catch (error) {
      console.log("PostgreSQL: Bot user creation error:", (error as Error).message);
      throw error;
    }
  }

  // Typing indicators
  async setTyping(userId: string, roomId: string, username: string): Promise<void> {
    const key = `${userId}:${roomId}`;
    this.typingIndicators.set(key, {
      userId,
      roomId,
      username,
      timestamp: new Date()
    });
  }

  async clearTyping(userId: string, roomId: string): Promise<void> {
    const key = `${userId}:${roomId}`;
    this.typingIndicators.delete(key);
  }

  async getTypingUsers(roomId: string): Promise<TypingIndicator[]> {
    const indicators = Array.from(this.typingIndicators.values())
      .filter(indicator => indicator.roomId === roomId);
    return indicators;
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

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    // Check if this is the first user (admin)
    const existingUsers = await this.db.select().from(users).limit(1);
    const isFirstUser = existingUsers.length === 0;
    
    const result = await this.db.insert(users).values({
      ...user,
      isAdmin: isFirstUser,
      lastSeen: new Date()
    }).returning();
    
    return result[0];
  }

  async updateUserStatus(id: string, status: string): Promise<User | undefined> {
    const result = await this.db.update(users)
      .set({ status, lastSeen: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserProfile(id: string, username: string, profileImage?: string): Promise<User | undefined> {
    const updateData: any = { username };
    if (profileImage !== undefined) {
      updateData.profileImage = profileImage;
    }
    
    const result = await this.db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
      
    // Update DM room names when username changes
    if (result[0]) {
      await this.updateDMRoomNames(id, username);
    }
    
    return result[0];
  }

  private async updateDMRoomNames(userId: string, newUsername: string): Promise<void> {
    try {
      const dmRooms = await this.db.select().from(rooms)
        .where(eq(rooms.isDM, true));
      
      for (const room of dmRooms) {
        if (room.participants && room.participants.includes(userId)) {
          // Get all participant usernames
          const participantUsers = await Promise.all(
            room.participants.map((id: string) => this.getUser(id))
          );
          
          const validUsers = participantUsers.filter(user => user !== undefined);
          const usernames = validUsers.map(user => user!.username);
          
          const newRoomName = usernames.join(', ');
          await this.db.update(rooms)
            .set({ name: newRoomName })
            .where(eq(rooms.id, room.id));
        }
      }
    } catch (error) {
      console.error('Error updating DM room names:', error);
    }
  }

  async banUser(id: string, bannedUntil: Date | null): Promise<User | undefined> {
    const result = await this.db.update(users)
      .set({ bannedUntil })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getOnlineUsers(): Promise<User[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineUsers = await this.db.select().from(users)
      .where(eq(users.status, "online"));
    
    // NexaBot'u her zaman online olarak göster
    const nexaBot = await this.getUserByUsername("NexaBot");
    if (nexaBot && !onlineUsers.find((user: User) => user.username === "NexaBot")) {
      // NexaBot'u online yap ve listeye ekle
      await this.updateUserStatus(nexaBot.id, "online");
      onlineUsers.push({ ...nexaBot, status: "online" });
    }
    
    return onlineUsers;
  }

  async getOfflineUsers(): Promise<User[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return await this.db.select().from(users)
      .where(eq(users.status, "offline"));
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  // Rooms
  async getRoom(id: string): Promise<Room | undefined> {
    const result = await this.db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
    return result[0];
  }

  async getRoomByName(name: string): Promise<Room | undefined> {
    const result = await this.db.select().from(rooms).where(eq(rooms.name, name)).limit(1);
    return result[0];
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const result = await this.db.insert(rooms).values({
      ...room,
      messageCount: 0
    }).returning();
    return result[0];
  }

  async getAllRooms(): Promise<RoomWithMessageCount[]> {
    return await this.db.select().from(rooms);
  }

  async incrementRoomMessageCount(roomId: string): Promise<void> {
    await this.db.update(rooms)
      .set({ messageCount: sql`${rooms.messageCount} + 1` })
      .where(eq(rooms.id, roomId));
  }

  async deleteRoom(id: string): Promise<boolean> {
    const result = await this.db.delete(rooms).where(eq(rooms.id, id));
    return result.rowCount > 0;
  }

  async updateRoomName(id: string, name: string): Promise<boolean> {
    const result = await this.db.update(rooms)
      .set({ name })
      .where(eq(rooms.id, id));
    return result.rowCount > 0;
  }

  // Messages
  async getMessage(id: string): Promise<Message | undefined> {
    const result = await this.db.select().from(messages).where(eq(messages.id, id)).limit(1);
    return result[0];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await this.db.insert(messages).values({
      ...message,
      createdAt: new Date()
    }).returning();
    
    // Increment room message count
    await this.incrementRoomMessageCount(message.roomId);
    
    return result[0];
  }

  async updateMessage(id: string, content: string): Promise<Message | undefined> {
    const result = await this.db.update(messages)
      .set({ content, editedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return result[0];
  }

  async updateMessagePollVotes(id: string, pollVotes: Record<number, number>): Promise<Message | undefined> {
    // This might need to be handled differently depending on how poll votes are stored
    const result = await this.db.update(messages)
      .set({ editedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return result[0];
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await this.db.delete(messages).where(eq(messages.id, id));
    return result.rowCount > 0;
  }

  async getMessagesByRoom(roomId: string, limit?: number): Promise<MessageWithUser[]> {
    const query = this.db.select({
      id: messages.id,
      roomId: messages.roomId,
      userId: messages.userId,
      content: messages.content,
      messageType: messages.messageType,
      fileName: messages.fileName,
      filePath: messages.filePath,
      fileSize: messages.fileSize,
      createdAt: messages.createdAt,
      editedAt: messages.editedAt,
      replyToId: messages.replyToId,
      fileGroupId: messages.fileGroupId,
      groupIndex: messages.groupIndex,
      user: {
        id: users.id,
        username: users.username,
        profileImage: users.profileImage,
        status: users.status,
        isAdmin: users.isAdmin,
        lastSeen: users.lastSeen,
        bannedUntil: users.bannedUntil
      }
    })
    .from(messages)
    .leftJoin(users, eq(messages.userId, users.id))
    .where(eq(messages.roomId, roomId))
    .orderBy(desc(messages.createdAt));

    if (limit) {
      query.limit(limit);
    }

    const result = await query;
    return result.reverse(); // Reverse to get chronological order
  }

  async getAllMessages(): Promise<MessageWithUser[]> {
    const result = await this.db.select({
      id: messages.id,
      roomId: messages.roomId,
      userId: messages.userId,
      content: messages.content,
      messageType: messages.messageType,
      fileName: messages.fileName,
      filePath: messages.filePath,
      fileSize: messages.fileSize,
      createdAt: messages.createdAt,
      editedAt: messages.editedAt,
      replyToId: messages.replyToId,
      fileGroupId: messages.fileGroupId,
      groupIndex: messages.groupIndex,
      user: {
        id: users.id,
        username: users.username,
        profileImage: users.profileImage,
        status: users.status,
        isAdmin: users.isAdmin,
        lastSeen: users.lastSeen,
        bannedUntil: users.bannedUntil
      }
    })
    .from(messages)
    .leftJoin(users, eq(messages.userId, users.id))
    .orderBy(desc(messages.createdAt));

    return result;
  }

  // DM functionality
  async createDMRoom(user1Id: string, user2Id: string): Promise<Room> {
    const user1 = await this.getUser(user1Id);
    const user2 = await this.getUser(user2Id);
    
    if (!user1 || !user2) {
      throw new Error("Kullanıcılar bulunamadı");
    }

    const result = await this.db.insert(rooms).values({
      name: `${user1.username}, ${user2.username}`,
      description: `${user1.username} ve ${user2.username} arasında özel mesajlaşma`,
      messageCount: 0,
      isDM: true,
      participants: [user1Id, user2Id]
    }).returning();
    
    return result[0];
  }

  async getDMRoom(user1Id: string, user2Id: string): Promise<Room | null> {
    const result = await this.db.select().from(rooms)
      .where(and(
        eq(rooms.isDM, true),
        // Note: This is a simplified check. In a real implementation,
        // you'd want to properly query the participants array
      ));
    
    const dmRoom = result.find((room: Room) => 
      room.participants && 
      room.participants.includes(user1Id) && 
      room.participants.includes(user2Id)
    );
    
    return dmRoom || null;
  }

  async getUserDMRooms(userId: string): Promise<Room[]> {
    const result = await this.db.select().from(rooms)
      .where(eq(rooms.isDM, true));
    
    return result.filter((room: Room) => 
      room.participants && 
      room.participants.includes(userId)
    );
  }

  async addUserToDMRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      if (room && room.isDM && room.participants) {
        if (!room.participants.includes(userId) && room.participants.length < 4) {
          const updatedParticipants = [...room.participants, userId];
          await this.db.update(rooms)
            .set({ participants: updatedParticipants })
            .where(eq(rooms.id, roomId));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error adding user to DM room:', error);
      return false;
    }
  }

  async removeUserFromDMRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      if (room && room.isDM && room.participants) {
        const updatedParticipants = room.participants.filter(id => id !== userId);
        if (updatedParticipants.length >= 2) {
          await this.db.update(rooms)
            .set({ participants: updatedParticipants })
            .where(eq(rooms.id, roomId));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error removing user from DM room:', error);
      return false;
    }
  }

  async deleteOldMessages(): Promise<number> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await this.db.delete(messages)
        .where(sql`${messages.createdAt} < ${twentyFourHoursAgo}`);
      
      const deletedCount = result.rowCount || 0;
      console.log(`24 saatlik temizlik: ${deletedCount} mesaj silindi`);
      return deletedCount;
    } catch (error) {
      console.error('Error deleting old messages:', error);
      return 0;
    }
  }
}

// Always use PostgreSQL storage when DATABASE_URL is available
export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
