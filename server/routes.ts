import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import session from "express-session";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertRoomSchema } from "@shared/schema";
import { z } from "zod";
import { nexaBot } from "./nexabot";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup
  app.use(
    session({
      secret: "chat-nexus-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }, // Set to true if using HTTPS
    })
  );

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten kullanılıyor" });
      }
      const user = await storage.createUser(userData);
      (req.session as any).userId = user.id;
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Kayıt başarısız" });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Geçersiz kullanıcı adı veya şifre" });
    }
    (req.session as any).userId = user.id;
    res.json(user);
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Çıkış yapıldı" });
    });
  });

  app.get("/api/user", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Giriş yapılmadı" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    res.json(user);
  });

  // Message routes
  app.get("/api/rooms/:roomId/messages", async (req, res) => {
    try {
      const { roomId } = req.params;
      const limit = parseInt(req.query.limit as string) || 400; // Default to 400 messages
      
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

  // Configure multer for file uploads
  const upload = multer({
    dest: 'uploads/',
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
      files: 20, // Allow up to 20 files at once
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|pdf|doc|docx|txt|zip|rar|webm|mp3|wav|ogg|m4a/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = file.mimetype.startsWith('audio/') || 
                       file.mimetype.startsWith('video/') || 
                       file.mimetype.startsWith('image/') || 
                       /application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|zip|x-rar-compressed)/.test(file.mimetype) ||
                       file.mimetype === 'text/plain';
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Desteklenmeyen dosya türü'));
      }
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      
      // Verify room exists - try both regular rooms and DM rooms
      let room = await storage.getRoom(messageData.roomId);
      if (!room) {
        // Try to find it as a DM room
        const allRooms = await storage.getAllRooms();
        room = allRooms.find(r => r.id === messageData.roomId);
        if (!room) {
          console.error(`Room not found: ${messageData.roomId}`);
          return res.status(404).json({ message: "Oda bulunamadı" });
        }
      }
      
      // Verify user exists
      const user = await storage.getUser(messageData.userId);
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Check for @mentions in DM messages to create group chats
      if (messageData.content && room.name.startsWith("@")) {
        const mentionRegex = /@(\w+)/g;
        let match;
        const mentionedUsernames = [];
        
        while ((match = mentionRegex.exec(messageData.content)) !== null) {
          mentionedUsernames.push(match[1]);
        }
        
        if (mentionedUsernames.length > 0) {
          // Get all mentioned users
          const allUsers = await storage.getAllUsers();
          const mentionedUsers = mentionedUsernames
            .map(username => allUsers.find(u => u && u.username.toLowerCase() === username.toLowerCase()))
            .filter(user => user !== undefined);
          
          if (mentionedUsers.length > 0) {
            // Convert DM to group by updating room name
            const currentParticipants = room.name.replace("@", "").split(", ");
            const allParticipants = currentParticipants.concat(mentionedUsers.map(u => u!.username));
            const uniqueParticipants = Array.from(new Set(allParticipants)).sort();
            
            const newRoomName = `@${uniqueParticipants.join(", ")}`;
            await storage.updateRoomName(room.id, newRoomName);
          }
        }
      }
      
      // Convert attachments array to JSON string for storage
      if (messageData.attachments && messageData.attachments.length > 0) {
        messageData.attachments = JSON.stringify(messageData.attachments) as any;
      }
      
      const message = await storage.createMessage(messageData);
      const messageWithUser = { ...message, user };
      
      // Process message for bot commands
      await nexaBot.processMessage(messageWithUser, messageData.roomId);
      
      res.json(messageWithUser);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Mesaj gönderilemedi" });
    }
  });

  // Multiple file upload route
  app.post("/api/upload", upload.array('files', 20), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Dosya seçilmedi" });
      }

      const fileInfos = files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: `/uploads/${file.filename}`
      }));

      res.json(fileInfos);
    } catch (error) {
      res.status(500).json({ message: "Dosya yüklenemedi" });
    }
  });

  // Grouped file message route
  app.post("/api/messages/files", async (req, res) => {
    try {
      const { roomId, userId, files } = req.body;
      
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ message: "Dosya bilgisi eksik" });
      }

      // Verify room exists
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Oda bulunamadı" });
      }
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Generate a unique group ID for all files
      const { nanoid } = await import('nanoid');
      const fileGroupId = nanoid();

      // Create messages for all files with the same group ID
      const messages = [];
      for (const file of files) {
        const messageType = file.mimetype.startsWith('image/') ? 'image' :
                          file.mimetype.startsWith('video/') ? 'video' : 'file';
        
        const messageData = {
          roomId,
          userId,
          messageType,
          fileName: file.originalName,
          filePath: file.path,
          fileSize: file.size,
          fileGroupId: files.length > 1 ? fileGroupId : null
        };

        const message = await storage.createMessage(messageData);
        messages.push({ ...message, user });
      }

      res.json(messages);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Dosyalar gönderilemedi" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Message editing and deletion
  app.patch("/api/messages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { content, userId } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Mesaj içeriği gerekli" });
      }
      
      const message = await storage.getMessage(id);
      if (!message) {
        return res.status(404).json({ message: "Mesaj bulunamadı" });
      }
      
      // Check if user is the message author or admin
      const user = await storage.getUser(userId);
      if (!user || (message.userId !== userId && !user.isAdmin)) {
        return res.status(403).json({ message: "Bu mesajı düzenleme yetkiniz yok" });
      }
      
      const updatedMessage = await storage.updateMessage(id, content);
      res.json(updatedMessage);
    } catch (error) {
      res.status(500).json({ message: "Mesaj güncellenemedi" });
    }
  });

  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      const message = await storage.getMessage(id);
      if (!message) {
        return res.status(404).json({ message: "Mesaj bulunamadı" });
      }
      
      // Check if user is the message author or admin
      const user = await storage.getUser(userId);
      if (!user || (message.userId !== userId && !user.isAdmin)) {
        return res.status(403).json({ message: "Bu mesajı silme yetkiniz yok" });
      }
      
      // If it's a file message, also delete the file
      if (message.filePath && message.fileName) {
        const fs = await import('fs');
        const filePath = message.filePath.replace('/uploads/', 'uploads/');
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fileError) {
          console.error('Error deleting file:', fileError);
        }
      }
      
      const success = await storage.deleteMessage(id);
      if (!success) {
        return res.status(404).json({ message: "Mesaj silinemedi" });
      }
      
      res.json({ message: "Mesaj silindi" });
    } catch (error) {
      res.status(500).json({ message: "Mesaj silinemedi" });
    }
  });

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

  // Typing indicators
  app.post("/api/rooms/:roomId/typing", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId, username } = req.body;
      
      if (!userId || !username) {
        return res.status(400).json({ message: "UserId ve username gerekli" });
      }
      
      await storage.setTyping(userId, roomId, username);
      res.json({ message: "Yazma durumu ayarlandı" });
    } catch (error) {
      res.status(500).json({ message: "Yazma durumu ayarlanamadı" });
    }
  });

  app.delete("/api/rooms/:roomId/typing", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "UserId gerekli" });
      }
      
      await storage.clearTyping(userId, roomId);
      res.json({ message: "Yazma durumu temizlendi" });
    } catch (error) {
      res.status(500).json({ message: "Yazma durumu temizlenemedi" });
    }
  });

  app.get("/api/rooms/:roomId/typing", async (req, res) => {
    try {
      const { roomId } = req.params;
      const typingUsers = await storage.getTypingUsers(roomId);
      res.json(typingUsers);
    } catch (error) {
      res.status(500).json({ message: "Yazanlar alınamadı" });
    }
  });




  // DM routes
  app.post("/api/dm/create", async (req, res) => {
    try {
      const { user1Id, user2Id } = req.body;
      
      if (!user1Id || !user2Id) {
        return res.status(400).json({ message: "İki kullanıcı ID'si gerekli" });
      }
      
      if (user1Id === user2Id) {
        return res.status(400).json({ message: "Kendinizle DM başlatamazsınız" });
      }
      
      // Check if DM room already exists
      let dmRoom = await storage.getDMRoom(user1Id, user2Id);
      
      if (!dmRoom) {
        dmRoom = await storage.createDMRoom(user1Id, user2Id);
      }
      
      res.json(dmRoom);
    } catch (error) {
      res.status(500).json({ message: "DM odası oluşturulamadı" });
    }
  });

  app.get("/api/dm/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const dmRooms = await storage.getUserDMRooms(userId);
      res.json(dmRooms);
    } catch (error) {
      res.status(500).json({ message: "DM odaları alınamadı" });
    }
  });

  // DM'e kullanıcı ekleme (@etiketleme ile +2 kullanıcı)
  app.post("/api/dm/:roomId/add-user", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId, adderId } = req.body;
      
      if (!userId || !adderId) {
        return res.status(400).json({ message: "Kullanıcı ID'si ve ekleyen ID'si gerekli" });
      }
      
      // Ekleyen kişi DM'in katılımcısı mı kontrol et
      const room = await storage.getRoom(roomId);
      if (!room || !room.isDM || !room.participants?.includes(adderId)) {
        return res.status(403).json({ message: "Bu DM'e kullanıcı ekleme yetkiniz yok" });
      }
      
      // Kullanıcı var mı kontrol et
      const userToAdd = await storage.getUser(userId);
      if (!userToAdd) {
        return res.status(404).json({ message: "Eklenecek kullanıcı bulunamadı" });
      }
      
      const success = await storage.addUserToDMRoom(roomId, userId);
      if (success) {
        // Sistem mesajı gönder
        const adder = await storage.getUser(adderId);
        await storage.createMessage({
          roomId,
          userId: adderId,
          content: `@${userToAdd.username} DM grubuna eklendi`,
          messageType: "system"
        });
        
        res.json({ message: `${userToAdd.username} DM'e eklendi`, success: true });
      } else {
        res.status(400).json({ message: "Kullanıcı eklenemedi (zaten DM'de veya maksimum 4 kişi sınırı)" });
      }
    } catch (error) {
      res.status(500).json({ message: "Kullanıcı DM'e eklenemedi" });
    }
  });

  // DM'den kullanıcı çıkarma
  app.post("/api/dm/:roomId/remove-user", async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId, removerId } = req.body;
      
      if (!userId || !removerId) {
        return res.status(400).json({ message: "Kullanıcı ID'si ve çıkaran ID'si gerekli" });
      }
      
      // Çıkaran kişi DM'in katılımcısı mı kontrol et
      const room = await storage.getRoom(roomId);
      if (!room || !room.isDM || !room.participants?.includes(removerId)) {
        return res.status(403).json({ message: "Bu DM'den kullanıcı çıkarma yetkiniz yok" });
      }
      
      const success = await storage.removeUserFromDMRoom(roomId, userId);
      if (success) {
        // Sistem mesajı gönder
        const userToRemove = await storage.getUser(userId);
        await storage.createMessage({
          roomId,
          userId: removerId,
          content: `@${userToRemove?.username || 'Kullanıcı'} DM grubundan çıkarıldı`,
          messageType: "system"
        });
        
        res.json({ message: "Kullanıcı DM'den çıkarıldı", success: true });
      } else {
        res.status(400).json({ message: "Kullanıcı çıkarılamadı (minimum 2 kişi gerekli)" });
      }
    } catch (error) {
      res.status(500).json({ message: "Kullanıcı DM'den çıkarılamadı" });
    }
  });

  // 24 saatlik mesaj temizleme endpoint (manuel tetikleme için)
  app.post("/api/admin/cleanup-messages", async (req, res) => {
    try {
      const { userId } = req.body;
      
      // Admin kontrolü (isteğe bağlı)
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Sadece yöneticiler mesaj temizleyebilir" });
      }
      
      const deletedCount = await storage.deleteOldMessages();
      res.json({ message: `${deletedCount} eski mesaj silindi`, deletedCount });
    } catch (error) {
      res.status(500).json({ message: "Mesaj temizliği başarısız" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
