import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  profileImage: text("profile_image"),
  status: text("status").notNull().default("online"), // online, away, busy, offline
  isAdmin: boolean("is_admin").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  bannedUntil: timestamp("banned_until"),
});

export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  messageCount: integer("message_count").default(0),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content"),
  messageType: text("message_type").notNull().default("text"), // text, image, video, file, system
  fileName: text("file_name"),
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow(),
  editedAt: timestamp("edited_at"),
  replyToId: varchar("reply_to_id"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastSeen: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  messageCount: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Extended types for API responses
export type MessageWithUser = Message & {
  user: User;
  replyTo?: MessageWithUser;
};

export type RoomWithMessageCount = Room & {
  messageCount: number;
};

// Typing indicator types
export type TypingIndicator = {
  userId: string;
  username: string;
  roomId: string;
  timestamp: Date;
};

// DM Room type (extending Room for DM functionality)
export type DMRoom = Room & {
  isDM: boolean;
  participants?: string[]; // User IDs participating in the DM
};
