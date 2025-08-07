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
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 20, // Allow up to 20 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, documents, archives, and audio files
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|pdf|doc|docx|txt|zip|rar|webm|mp3|wav|ogg|m4a/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    // Allow audio mimetypes for voice messages
    const audioTypes = /audio\/(webm|mpeg|mp4|wav|ogg|x-wav|x-m4a)/;
    const videoTypes = /video\/(mp4|webm|quicktime|x-msvideo|x-matroska)/;
    const imageTypes = /image\/(jpeg|jpg|png|gif|webp)/;
    const docTypes = /application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|zip|x-rar-compressed)/;
    const textTypes = /text\/plain/;
    
    const mimetype = audioTypes.test(file.mimetype) || 
                     videoTypes.test(file.mimetype) || 
                     imageTypes.test(file.mimetype) || 
                     docTypes.test(file.mimetype) || 
                     textTypes.test(file.mimetype);
    
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
      
      // Send a random welcome message to the general room
      const welcomeMessages = [
        `Vahşi bir @${userData.username} belirdi!`,
        `@${userData.username} spawn oldu.`,
        `@${userData.username} oyuna giriş yaptı.`,
        `@${userData.username} portaldan içeri düştü.`,
        `@${userData.username} uzay-zamanı yararak geldi.`,
        `Partiye yeni bir üye katıldı: @${userData.username}`,
        `@${userData.username} başarıyla sunucuya yüklendi.`,
        `@${userData.username}, evrende yeni bir maceraya başladı.`,
        `Duyuru: @${userData.username} sunucuya iniş yaptı.`,
        `Sistem mesajı: @${userData.username} artık aramızda.`,
        `@${userData.username}, boyutlar arası yolculuğunu tamamladı.`,
        `[GÜNCELLEME]: Yeni karakter eklendi: @${userData.username}`,
        `@${userData.username} geldi, internet yavaşladı.`,
        `@${userData.username} geldi, herkes cool davranın.`,
        `@${userData.username} katıldı, kaos seviyesi +1.`
      ];
      
      const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
      
      // Don't send welcome message for DM creation or general room
      // Users will be welcomed naturally in chat
      
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Kullanıcı oluşturulamadı" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Kullanıcılar alınamadı" });
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

  app.get("/api/users/offline", async (req, res) => {
    try {
      const users = await storage.getOfflineUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Çevrimdışı kullanıcılar alınamadı" });
    }
  });

  app.patch("/api/users/:id/profile", async (req, res) => {
    try {
      const { id } = req.params;
      const { username, profileImage } = req.body;
      
      if (!username) {
        return res.status(400).json({ message: "Kullanıcı adı gerekli" });
      }
      
      // Check if username is taken by another user
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten kullanılıyor" });
      }
      
      const user = await storage.updateUserProfile(id, username, profileImage);
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Profil güncellenemedi" });
    }
  });

  app.patch("/api/users/:id/ban", async (req, res) => {
    try {
      const { id } = req.params;
      const { duration } = req.body; // minutes, "permanent", or null to unban
      
      let bannedUntil: Date | null = null;
      if (duration === "permanent") {
        bannedUntil = new Date("2099-12-31"); // Far future date
      } else if (duration && typeof duration === "number") {
        bannedUntil = new Date(Date.now() + duration * 60 * 1000);
      }
      
      const user = await storage.banUser(id, bannedUntil);
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Kullanıcı banlanamadı" });
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

  // Admin: Reorder rooms
  app.put("/api/rooms/reorder", async (req, res) => {
    try {
      const { rooms } = req.body;
      
      // For this basic implementation, just acknowledge the reorder
      // In production, you'd update room order in database
      if (!Array.isArray(rooms)) {
        return res.status(400).json({ message: "Geçersiz oda listesi" });
      }
      
      res.json({ message: "Odalar yeniden sıralandı" });
    } catch (error) {
      res.status(500).json({ message: "Odalar yeniden sıralanamadı" });
    }
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
      
      const message = await storage.createMessage(messageData);
      const messageWithUser = { ...message, user };
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

  const httpServer = createServer(app);
  return httpServer;
}
