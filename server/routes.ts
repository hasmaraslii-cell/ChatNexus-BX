import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertRoomSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and common document types
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya türü'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten kullanılıyor" });
      }
      
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Kullanıcı oluşturulamadı" });
    }
  });

  app.get("/api/users/online", async (req, res) => {
    try {
      const users = await storage.getOnlineUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Çevrimiçi kullanıcılar alınamadı" });
    }
  });

  app.patch("/api/users/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!["online", "away", "busy"].includes(status)) {
        return res.status(400).json({ message: "Geçersiz durum" });
      }
      
      const user = await storage.updateUserStatus(id, status);
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Kullanıcı durumu güncellenemedi" });
    }
  });

  // Room routes
  app.get("/api/rooms", async (req, res) => {
    try {
      const rooms = await storage.getAllRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Odalar alınamadı" });
    }
  });

  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const room = await storage.getRoom(id);
      if (!room) {
        return res.status(404).json({ message: "Oda bulunamadı" });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Oda alınamadı" });
    }
  });

  // Admin: Create new room
  app.post("/api/rooms", async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse(req.body);
      const { userId } = req.body;
      
      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Sadece yöneticiler oda oluşturabilir" });
      }
      
      // Check if room name already exists
      const existingRoom = await storage.getRoomByName(roomData.name);
      if (existingRoom) {
        return res.status(400).json({ message: "Bu oda adı zaten kullanılıyor" });
      }
      
      const room = await storage.createRoom(roomData);
      res.json(room);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Oda oluşturulamadı" });
    }
  });

  // Admin: Delete room
  app.delete("/api/rooms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Sadece yöneticiler oda silebilir" });
      }
      
      const success = await storage.deleteRoom(id);
      if (!success) {
        return res.status(404).json({ message: "Oda bulunamadı" });
      }
      
      res.json({ message: "Oda silindi" });
    } catch (error) {
      res.status(500).json({ message: "Oda silinemedi" });
    }
  });

  // Message routes
  app.get("/api/rooms/:roomId/messages", async (req, res) => {
    try {
      const { roomId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Oda bulunamadı" });
      }
      
      const messages = await storage.getMessagesByRoom(roomId, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Mesajlar alınamadı" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      
      // Verify room exists
      const room = await storage.getRoom(messageData.roomId);
      if (!room) {
        return res.status(404).json({ message: "Oda bulunamadı" });
      }
      
      // Verify user exists
      const user = await storage.getUser(messageData.userId);
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      const message = await storage.createMessage(messageData);
      const messageWithUser = { ...message, user };
      res.json(messageWithUser);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Mesaj gönderilemedi" });
    }
  });

  // File upload route
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Dosya seçilmedi" });
      }

      const fileInfo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: `/uploads/${req.file.filename}`
      };

      res.json(fileInfo);
    } catch (error) {
      res.status(500).json({ message: "Dosya yüklenemedi" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // File download route
  app.get("/api/download/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(process.cwd(), 'uploads', filename);
      res.download(filePath);
    } catch (error) {
      res.status(404).json({ message: "Dosya bulunamadı" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
