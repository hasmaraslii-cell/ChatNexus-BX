import { type User, type InsertUser, type Room, type InsertRoom, type Message, type InsertMessage, type MessageWithUser, type RoomWithMessageCount, type TypingIndicator, users, rooms, messages, reactions } from "@shared/schema";
import { randomUUID } from "crypto";
import { botManager } from "./bot-manager";
import { db } from "./db";
import { eq, and, desc, inArray, sql, ne } from "drizzle-orm";

export interface IStorage {
  setTyping(userId: string, roomId: string, username: string): Promise<void>;
  clearTyping(userId: string, roomId: string): Promise<void>;
  getTypingUsers(roomId: string): Promise<TypingIndicator[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: string, status: string): Promise<User | undefined>;
  updateUserProfile(id: string, username: string, profileImage?: string): Promise<User | undefined>;
  updateAdminLevel(id: string, level: number): Promise<User | undefined>;
  banUser(id: string, bannedUntil: Date | null): Promise<User | undefined>;
  getOnlineUsers(): Promise<User[]>;
  getOfflineUsers(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<boolean>;
  getRoom(id: string): Promise<Room | undefined>;
  getRoomByName(name: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  getAllRooms(): Promise<RoomWithMessageCount[]>;
  incrementRoomMessageCount(roomId: string): Promise<void>;
  deleteRoom(id: string): Promise<boolean>;
  updateRoomName(id: string, name: string): Promise<boolean>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, content: string): Promise<Message | undefined>;
  updateMessagePollVotes(id: string, pollVotes: Record<number, number>): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;
  getMessagesByRoom(roomId: string, limit?: number): Promise<MessageWithUser[]>;
  getAllMessages(): Promise<MessageWithUser[]>;
  createDMRoom(user1Id: string, user2Id: string): Promise<Room>;
  getDMRoom(user1Id: string, user2Id: string): Promise<Room | null>;
  getUserDMRooms(userId: string): Promise<Room[]>;
  addUserToDMRoom(roomId: string, userId: string): Promise<boolean>;
  removeUserFromDMRoom(roomId: string, userId: string): Promise<boolean>;
  deleteOldMessages(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  private typingIndicators: Map<string, TypingIndicator>;

  constructor() {
    this.typingIndicators = new Map();
    this.initializeDefaults();
    setInterval(() => this.cleanupOldTypingIndicators(), 10000);
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
    const existingBot = await db.select().from(users).where(eq(users.username, "NexaBot")).limit(1);
    if (existingBot.length > 0) return;
    await db.insert(users).values({
      username: "NexaBot",
      password: null,
      displayName: "NexaBot",
      profileImage: "https://i.imgur.com/2FDBAwR.png",
      status: "online",
      isAdmin: true,
      adminLevel: 2,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const normalizedUsername = insertUser.username.toLowerCase();
    const isSuperAdmin = normalizedUsername === "raith1905" || normalizedUsername === "admin";
    const [user] = await db.insert(users).values({
      username: normalizedUsername,
      password: insertUser.password || null,
      displayName: insertUser.displayName || insertUser.username,
      profileImage: insertUser.profileImage || null,
      status: insertUser.status || "online",
      isAdmin: isSuperAdmin || insertUser.isAdmin || false,
      adminLevel: isSuperAdmin ? 2 : (insertUser.isAdmin ? 1 : 0),
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
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return updatedUser || undefined;
  }

  async updateAdminLevel(id: string, level: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ adminLevel: level, isAdmin: level > 0, lastSeen: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async banUser(id: string, bannedUntil: Date | null): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set({ bannedUntil, lastSeen: new Date(), status: "offline" }).where(eq(users.id, id)).returning();
    return updatedUser || undefined;
  }

  async getOnlineUsers(): Promise<User[]> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const allUsers = await db.select().from(users).where(ne(users.username, "NexaBot"));
    
    const online = allUsers.filter(user => {
      const isActive = user.lastSeen && user.lastSeen >= fiveMinutesAgo;
      const isNotBanned = !user.bannedUntil || user.bannedUntil < now;
      return isActive && isNotBanned && user.status !== "offline";
    });

    const bot = await this.getUserByUsername("NexaBot");
    if (bot) online.push(bot);
    return online;
  }

  async getOfflineUsers(): Promise<User[]> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const allUsers = await db.select().from(users).where(ne(users.username, "NexaBot"));
    
    return allUsers.filter(user => {
      const isInactive = !user.lastSeen || user.lastSeen < fiveMinutesAgo;
      const isOffline = user.status === "offline";
      const isNotBanned = !user.bannedUntil || user.bannedUntil < now;
      return (isInactive || isOffline) && isNotBanned;
    });
  }

  async getAllUsers(): Promise<User[]> { return await db.select().from(users); }
  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

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
      const messageCount = await db.select({ count: sql<number>`count(*)` }).from(messages).where(eq(messages.roomId, room.id));
      roomsWithCount.push({ ...room, messageCount: Number(messageCount[0]?.count || 0) });
    }
    return roomsWithCount;
  }
  async incrementRoomMessageCount(roomId: string): Promise<void> {
    await db.update(rooms).set({ messageCount: sql`${rooms.messageCount} + 1` }).where(eq(rooms.id, roomId));
  }
  async updateRoomName(id: string, name: string): Promise<boolean> {
    const result = await db.update(rooms).set({ name }).where(eq(rooms.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  async deleteRoom(id: string): Promise<boolean> {
    const result = await db.delete(rooms).where(eq(rooms.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

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
    const roomMessages = await db.select({ message: messages, user: users }).from(messages).innerJoin(users, eq(messages.userId, users.id)).where(eq(messages.roomId, roomId)).orderBy(desc(messages.createdAt)).limit(limit);
    return roomMessages.reverse().map(({ message, user }) => ({ ...message, user }));
  }
  async updateMessage(id: string, content: string): Promise<Message | undefined> {
    const [updatedMessage] = await db.update(messages).set({ content, editedAt: new Date() }).where(eq(messages.id, id)).returning();
    return updatedMessage || undefined;
  }
  async updateMessagePollVotes(id: string, pollVotes: Record<number, number>): Promise<Message | undefined> { return undefined; }
  async deleteMessage(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  async getAllMessages(): Promise<MessageWithUser[]> {
    const allMessages = await db.select({ message: messages, user: users }).from(messages).innerJoin(users, eq(messages.userId, users.id)).orderBy(desc(messages.createdAt));
    return allMessages.map(({ message, user }) => ({ ...message, user }));
  }

  async setTyping(userId: string, roomId: string, username: string): Promise<void> {
    this.typingIndicators.set(`${userId}-${roomId}`, { userId, username, roomId, timestamp: new Date() });
  }
  async clearTyping(userId: string, roomId: string): Promise<void> { this.typingIndicators.delete(`${userId}-${roomId}`); }
  async getTypingUsers(roomId: string): Promise<TypingIndicator[]> {
    const cutoffTime = new Date(Date.now() - 5000);
    return Array.from(this.typingIndicators.values()).filter(indicator => indicator.roomId === roomId && indicator.timestamp > cutoffTime);
  }
  private cleanupOldTypingIndicators(): void {
    const cutoffTime = new Date(Date.now() - 10000);
    Array.from(this.typingIndicators.entries()).forEach(([key, indicator]) => { if (indicator.timestamp < cutoffTime) this.typingIndicators.delete(key); });
  }

  async createDMRoom(user1Id: string, user2Id: string): Promise<Room> {
    const user1 = await this.getUser(user1Id);
    const user2 = await this.getUser(user2Id);
    if (!user1 || !user2) throw new Error("Kullanıcılar bulunamadı");
    const [room] = await db.insert(rooms).values({ name: `${user1.username}, ${user2.username}`, description: `${user1.username} ve ${user2.username} arasında özel mesajlaşma`, messageCount: 0, isDM: true, participants: [user1Id, user2Id] }).returning();
    return room;
  }
  async getDMRoom(user1Id: string, user2Id: string): Promise<Room | null> {
    const dmRooms = await db.select().from(rooms).where(and(eq(rooms.isDM, true), sql`${rooms.participants} @> ARRAY[${user1Id}]::text[]`, sql`${rooms.participants} @> ARRAY[${user2Id}]::text[]`));
    return dmRooms[0] || null;
  }
  async getUserDMRooms(userId: string): Promise<Room[]> { return await db.select().from(rooms).where(and(eq(rooms.isDM, true), sql`${rooms.participants} @> ARRAY[${userId}]::text[]`)); }
  async addUserToDMRoom(roomId: string, userId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (room && room.isDM && room.participants && !room.participants.includes(userId) && room.participants.length < 4) {
      const result = await db.update(rooms).set({ participants: [...room.participants, userId] }).where(eq(rooms.id, roomId));
      return result.rowCount !== null && result.rowCount > 0;
    }
    return false;
  }
  async removeUserFromDMRoom(roomId: string, userId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (room && room.isDM && room.participants) {
      const result = await db.update(rooms).set({ participants: room.participants.filter(id => id !== userId) }).where(eq(rooms.id, roomId));
      return result.rowCount !== null && result.rowCount > 0;
    }
    return false;
  }
  async deleteOldMessages(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await db.delete(messages).where(sql`${messages.createdAt} < ${twentyFourHoursAgo}`);
    return result.rowCount || 0;
  }
}

export const storage = new DatabaseStorage();
