import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Hash, Paperclip, Search, Bell, Plus, Smile, Send, X, Mic, MicOff, Reply, Image, Video } from "lucide-react";
import MessageItem from "@/components/message-item";
import FileUploadArea from "@/components/file-upload-area";
import MediaPreview from "@/components/media-preview";
import { useNotifications } from "@/hooks/use-notifications";

import type { Room, User, MessageWithUser, TypingIndicator } from "@shared/schema";

interface MainChatAreaProps {
  currentRoom: Room;
  currentUser: User;
  replyToMessage?: MessageWithUser | null;
  onClearReply?: () => void;
  onReply?: (message: MessageWithUser) => void;
  onStartDM?: (user: User) => void;
}

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'document' | 'archive' | 'audio';
}

export default function MainChatArea({ currentRoom, currentUser, replyToMessage, onClearReply, onReply, onStartDM }: MainChatAreaProps) {
  const [message, setMessage] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile[]>([]);

  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [suggestionUsers, setSuggestionUsers] = useState<User[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { sendMessageNotification } = useNotifications(currentUser);

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["/api/rooms", currentRoom.id, "messages"],
    refetchInterval: window.innerWidth <= 768 ? 5000 : 3000,
    staleTime: 2000,
  });

  const { data: allUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!currentUser,
    staleTime: 60000, // Cache users longer for mentions
  });

  const { data: typingUsers = [] } = useQuery({
    queryKey: ["/api/rooms", currentRoom.id, "typing"],
    enabled: !!currentUser && !!currentRoom,
    refetchInterval: 2000,
    staleTime: 1000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: {
      roomId: string;
      userId: string;
      content?: string;
      messageType: string;
      fileName?: string;
      filePath?: string;
      fileSize?: number;
      attachments?: Array<{type: string, url: string, name: string}>;
    }) => {
      const response = await apiRequest("POST", "/api/messages", messageData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", currentRoom.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Mesaj gönderilemedi",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive and send notifications
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    // Send notifications for new messages (only if we had previous messages)
    if (Array.isArray(messages) && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.userId !== currentUser.id) {
        sendMessageNotification(lastMessage);
      }
    }
  }, [messages, currentUser.id, sendMessageNotification]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() && selectedMedia.length === 0) return;

    let attachments: Array<{type: string, url: string, name: string}> = [];
    
    // Upload media files if any selected
    if (selectedMedia.length > 0) {
      const formData = new FormData();
      selectedMedia.forEach((media) => {
        formData.append('files', media.file);
      });

      try {
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error('Dosya yüklenemedi');
        }

        const uploadResults = await uploadResponse.json();
        attachments = uploadResults.map((result: any, index: number) => ({
          type: selectedMedia[index].type,
          url: result.path,
          name: result.originalName || result.filename
        }));
      } catch (error) {
        toast({
          title: "Hata",
          description: "Medya dosyaları yüklenemedi",
          variant: "destructive",
        });
        return;
      }
    }

    const messageData: any = {
      roomId: currentRoom.id,
      userId: currentUser.id,
      content: message.trim() || undefined,
      messageType: attachments.length > 0 ? "media" : "text",
      attachments
    };

    // Add reply reference if replying to a message
    if (replyToMessage) {
      messageData.replyToId = replyToMessage.id;
    }

    sendMessageMutation.mutate(messageData);

    setMessage("");
    setSelectedMedia([]);
    setIsTyping(false);
    
    // Clear typing indicator
    apiRequest("DELETE", `/api/rooms/${currentRoom.id}/typing`, {
      userId: currentUser.id,
    }).catch(console.error);
    
    // Clear reply after sending
    if (onClearReply) {
      onClearReply();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only send message with Ctrl+Enter or Cmd+Enter
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Escape key to close user suggestions
    if (e.key === 'Escape' && showUserSuggestions) {
      setShowUserSuggestions(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!currentUser || !currentRoom) return;

    // Check file size
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Dosya çok büyük",
        description: "Dosya 50MB'dan küçük olmalı",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('files', file);

    try {
      // Upload file
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Dosya yüklenemedi');
      }

      const uploadResult = await uploadResponse.json();
      
      if (uploadResult && uploadResult.length > 0) {
        const fileInfo = uploadResult[0];
        // Determine message type based on file type, with special handling for GIFs
        const messageType = file.type === 'image/gif' ? 'gif' :
                          file.type.startsWith('image/') ? 'image' :
                          file.type.startsWith('video/') ? 'video' :
                          file.type.startsWith('audio/') ? 'voice' : 'file';
        
        const messageData = {
          roomId: currentRoom.id,
          userId: currentUser.id,
          messageType,
          fileName: fileInfo.originalName,
          filePath: fileInfo.path,
          fileSize: fileInfo.size
        };

        sendMessageMutation.mutate(messageData);
        
        toast({
          title: "Başarılı",
          description: messageType === 'gif' ? "GIF gönderildi" : "Dosya gönderildi",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Dosya gönderilemedi",
        variant: "destructive",
      });
    }

    setShowFileUpload(false);
  };

  // Handle file selection for media preview
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newMediaFiles: MediaFile[] = [];
    
    for (let i = 0; i < Math.min(files.length, 20); i++) {
      const file = files[i];
      
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Dosya çok büyük",
          description: `${file.name} dosyası 50MB'dan küçük olmalı`,
          variant: "destructive",
        });
        continue;
      }

      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isDocument = file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text');
      const isArchive = file.type.includes('zip') || file.type.includes('rar') || file.type.includes('7z');
      const isAudio = file.type.startsWith('audio/');
      
      if (isImage || isVideo || isDocument || isArchive || isAudio) {
        const preview = URL.createObjectURL(file);
        let fileType: 'image' | 'video' | 'document' | 'archive' | 'audio' = 'document';
        
        if (isImage) fileType = 'image';
        else if (isVideo) fileType = 'video';
        else if (isArchive) fileType = 'archive';
        else if (isAudio) fileType = 'audio';
        
        newMediaFiles.push({
          file,
          preview,
          type: fileType as any
        });
      }
    }

    setSelectedMedia(prev => [...prev, ...newMediaFiles]);
    
    // Clear the input
    if (e.target) e.target.value = '';
  };

  const removeMediaFile = (index: number) => {
    setSelectedMedia(prev => {
      const newFiles = [...prev];
      // Revoke the URL to prevent memory leaks
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const clearAllMedia = () => {
    selectedMedia.forEach(media => URL.revokeObjectURL(media.preview));
    setSelectedMedia([]);
  };

  // Voice recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.addEventListener("dataavailable", (event) => {
        chunks.push(event.data);
      });

      recorder.addEventListener("stop", () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("files", audioBlob, "voice-message.webm");
        
        // Upload voice message
        fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        .then(response => response.json())
        .then(uploadResult => {
          if (uploadResult && uploadResult.length > 0) {
            const fileInfo = uploadResult[0];
            sendMessageMutation.mutate({
              roomId: currentRoom.id,
              userId: currentUser.id,
              messageType: "voice",
              fileName: "Sesli Mesaj",
              filePath: fileInfo.path,
              fileSize: fileInfo.size,
            });
          }
        })
        .catch(error => {
          toast({
            title: "Hata",
            description: "Sesli mesaj gönderilemedi",
            variant: "destructive",
          });
        });

        stream.getTracks().forEach(track => track.stop());
      });

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);

      toast({
        title: "Kayıt başladı",
        description: "Sesli mesajınızı kaydediyoruz",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Mikrofon erişimi reddedildi",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      toast({
        title: "Kayıt tamamlandı",
        description: "Sesli mesajınız gönderiliyor",
      });
    }
  };

  // Improved typing indicator handling with debouncing
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);



  // @mention functionality
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    
    setMessage(value);
    setCursorPosition(position);
    
    // Check for @mention
    const lastAtSymbol = value.lastIndexOf('@', position - 1);
    if (lastAtSymbol !== -1) {
      const query = value.substring(lastAtSymbol + 1, position);
      const spaceAfterAt = value.indexOf(' ', lastAtSymbol);
      
      if (spaceAfterAt === -1 || spaceAfterAt >= position) {
        setMentionQuery(query);
        setShowUserSuggestions(true);
        
        // Filter users based on query
        if (allUsers && Array.isArray(allUsers)) {
          const filteredUsers = allUsers.filter((user: User) =>
            user.username.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 5);
          setSuggestionUsers(filteredUsers);
        }
      } else {
        setShowUserSuggestions(false);
      }
    } else {
      setShowUserSuggestions(false);
    }
    
    // Improved typing indicators with debouncing
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      // Send typing indicator
      apiRequest("POST", `/api/rooms/${currentRoom.id}/typing`, {
        userId: currentUser.id,
        username: currentUser.username,
      }).catch(console.error);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to clear typing indicator  
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        apiRequest("DELETE", `/api/rooms/${currentRoom.id}/typing`, {
          userId: currentUser.id,
        }).catch(console.error);
      }
    }, 1000); // Stop typing indicator after 1 second of inactivity
  };

  const selectUser = (user: User) => {
    const lastAtSymbol = message.lastIndexOf('@', cursorPosition - 1);
    const beforeMention = message.substring(0, lastAtSymbol);
    const afterCursor = message.substring(cursorPosition);
    const newMessage = beforeMention + `@${user.username} ` + afterCursor;
    
    setMessage(newMessage);
    setShowUserSuggestions(false);
    
    // Focus and position cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = lastAtSymbol + user.username.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Handle paste events for GIFs from mobile keyboards (Gboard support)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const files = e.clipboardData.files;
    
    console.log('Paste event detected:', { items: items.length, files: files.length });
    
    // First check clipboardData.files (better for mobile keyboards like Gboard)
    if (files && files.length > 0) {
      e.preventDefault();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log('File from clipboardData.files:', file.type, file.name);
        
        if (file.type === 'image/gif') {
          toast({
            title: "GIF algılandı",
            description: "GIF'iniz yükleniyor...",
          });
        }
        
        await handleFileUpload(file);
      }
      return;
    }
    
    // Fallback to clipboardData.items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log('Clipboard item:', item.kind, item.type);
      
      // Check if the pasted item is a file (including GIFs)
      if (item.kind === 'file') {
        e.preventDefault();
        const file = item.getAsFile();
        
        if (file) {
          console.log('File from clipboardData.items:', file.type, file.name);
          
          // Handle GIF files specifically
          if (file.type === 'image/gif') {
            toast({
              title: "GIF algılandı",
              description: "GIF'iniz yükleniyor...",
            });
          }
          
          await handleFileUpload(file);
        }
        return;
      }
    }
  };

  // Handle drag and drop events for GIFs  
  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    
    const files = e.dataTransfer.files;
    console.log('Drop event detected:', files.length, 'files');
    
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log('Dropped file:', file.type, file.name);
        
        // Handle GIF files specifically
        if (file.type === 'image/gif') {
          toast({
            title: "GIF algılandı",
            description: "GIF'iniz yükleniyor...",
          });
        }
        
        await handleFileUpload(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  };

  // Global paste event listener for better mobile keyboard support (Gboard)
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      // Only handle if we're focused in the textarea or chat area
      const activeElement = document.activeElement;
      if (!textareaRef.current || !activeElement) return;
      
      // Check if textarea is focused or if we're in the chat area
      const isTextareaFocused = activeElement === textareaRef.current;
      const isInChatArea = textareaRef.current.contains(activeElement);
      
      if (isTextareaFocused || isInChatArea) {
        const items = e.clipboardData?.items;
        const files = e.clipboardData?.files;
        
        console.log('Global paste event (Gboard):', { 
          items: items?.length, 
          files: files?.length,
          focused: isTextareaFocused,
          inArea: isInChatArea 
        });
        
        // Check files first (this works better for mobile keyboards like Gboard)
        if (files && files.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log('Global paste file detected:', file.type, file.name, file.size);
            
            if (file.type === 'image/gif') {
              toast({
                title: "GIF başarıyla algılandı! 🎭",
                description: "Gboard'dan GIF yükleniyor...",
              });
            } else if (file.type.startsWith('image/')) {
              toast({
                title: "Resim algılandı! 🖼️",
                description: "Dosya yükleniyor...",
              });
            }
            
            await handleFileUpload(file);
          }
          return;
        }
        
        // Fallback to items for other paste scenarios
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            console.log('Global paste item:', item.kind, item.type);
            
            if (item.kind === 'file') {
              e.preventDefault();
              e.stopPropagation();
              
              const file = item.getAsFile();
              if (file) {
                console.log('Global paste item file:', file.type, file.name, file.size);
                
                if (file.type === 'image/gif') {
                  toast({
                    title: "GIF başarıyla algılandı! 🎭",
                    description: "Clipboard'dan GIF yükleniyor...",
                  });
                }
                
                await handleFileUpload(file);
              }
              return;
            }
          }
        }
      }
    };

    // Add event listener to document for global paste handling
    document.addEventListener('paste', handleGlobalPaste, true);
    
    return () => {
      document.removeEventListener('paste', handleGlobalPaste, true);
    };
  }, [handleFileUpload, toast]);

  return (
    <div className="flex flex-col h-full bg-[var(--discord-dark)] relative">


      {/* Messages Area - Fixed height with proper scrolling */}
      <div 
        className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-4 scroll-smooth"
        id="messages-container"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--discord-light) transparent'
        }}
      >
        {Array.isArray(messages) && messages.length > 0 && messages.map((msg: MessageWithUser) => (
          <MessageItem 
            key={msg.id} 
            message={msg} 
            currentUser={currentUser}
            onReply={onReply}
            allMessages={messages}
            onStartDM={onStartDM}
          />
        ))}
        {(!messages || !Array.isArray(messages) || messages.length === 0) && (
          <div className="flex items-center justify-center h-full text-[var(--discord-light)]/50">
            <p>Henüz mesaj yok. İlk mesajı siz gönderin!</p>
          </div>
        )}
        

        
        {/* Typing Indicator */}
        {Array.isArray(typingUsers) && typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-[var(--discord-light)]/70 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-[var(--discord-light)]/50 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-[var(--discord-light)]/50 rounded-full animate-bounce-delay-1"></div>
              <div className="w-2 h-2 bg-[var(--discord-light)]/50 rounded-full animate-bounce-delay-2"></div>
            </div>
            <span>
              {typingUsers.length === 1 
                ? `${typingUsers[0].username} yazıyor...`
                : typingUsers.length === 2
                ? `${typingUsers[0].username} ve ${typingUsers[1].username} yazıyor...`
                : typingUsers.length > 2
                ? "Pek çok kişi yazıyor..."
                : "Birisi yazıyor..."
              }
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Message Input Area */}
      <div className="flex-shrink-0 border-t border-[var(--discord-darker)] bg-[var(--discord-dark)]">
        <div className="p-3 md:p-4">
          {/* Reply Preview */}
          {replyToMessage && (
          <div className="mb-3 bg-gradient-to-r from-[var(--discord-blurple)]/10 to-[var(--discord-dark)] border border-[var(--discord-blurple)]/30 rounded-lg overflow-hidden shadow-md">
            <div className="flex items-start space-x-3 p-4">
              <div className="w-1 h-full bg-[var(--discord-blurple)] rounded-full self-stretch"></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Reply className="w-4 h-4 text-[var(--discord-blurple)]" />
                  <span className="text-xs font-medium text-[var(--discord-blurple)]">
                    {replyToMessage.user.username} kullanıcısına yanıt veriyorsunuz
                  </span>
                </div>
                <div className="bg-[var(--discord-darker)] rounded-md p-3 border-l-2 border-[var(--discord-blurple)]">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      {replyToMessage.user.profileImage ? (
                        <img src={replyToMessage.user.profileImage} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">{replyToMessage.user.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-[var(--discord-light)]">{replyToMessage.user.username}</span>
                  </div>
                  <p className="text-sm text-[var(--discord-light)]/80 line-clamp-2">
                    {replyToMessage.content || (
                      replyToMessage.messageType === "voice" ? "🎤 Sesli mesaj" :
                      replyToMessage.messageType === "image" ? "🖼️ Resim" :
                      replyToMessage.messageType === "gif" ? "🎭 GIF" :
                      replyToMessage.messageType === "file" ? "📁 Dosya" : "Medya mesajı"
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearReply}
                className="text-[var(--discord-light)]/50 hover:text-[var(--discord-light)] hover:bg-[var(--discord-dark)] p-2 rounded-full shrink-0"
                title="Yanıtı İptal Et"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          )}
          
          <div className="bg-[var(--discord-darker)] rounded-xl relative">
            {/* User Suggestions */}
            {showUserSuggestions && suggestionUsers.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[var(--discord-dark)] border border-[var(--discord-darker)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto z-10">
                {suggestionUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => selectUser(user)}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-[var(--discord-darker)] transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={user.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-sm">{user.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--discord-light)] font-medium">{user.username}</div>
                      <div className="text-[var(--discord-light)]/50 text-sm">@{user.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end p-3 space-x-2">
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-dark)] p-2 shrink-0"
                  title="Medya Dosyası Ekle"
                  onClick={() => document.getElementById('media-input')?.click()}
                  data-testid="button-add-media"
                >
                  <Image className="w-5 h-5" />
                </Button>
                <input
                  id="media-input"
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar,.7z"
                  multiple
                  className="hidden"
                  onChange={handleMediaSelect}
                />
              </div>
              

              
              <div className="flex-1 min-w-0 relative">
                {/* Hidden file input for mobile keyboards to detect */}
                <input 
                  type="file"
                  accept="image/*,image/gif,image/webp,image/png,image/jpeg,video/*"
                  multiple={false}
                  className="absolute inset-0 w-full h-full opacity-0 pointer-events-none z-[-1]"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="w-full bg-transparent text-[var(--discord-light)] placeholder:text-[var(--discord-light)]/50 resize-none border-none focus:ring-0 focus:outline-none min-h-0 p-0 text-sm md:text-base relative z-10"
                  placeholder={replyToMessage ? `${replyToMessage.user.username} kullanıcısına yanıt ver... (Ctrl+Enter: gönder)` : (currentRoom.isDM ? `@${currentRoom.name} kişisine mesaj gönder (Ctrl+Enter: gönder)` : `#${currentRoom.name} kanalına mesaj gönder (Ctrl+Enter: gönder)`)}
                  rows={1}
                  disabled={sendMessageMutation.isPending}
                  data-testid="textarea-message-input"
                  // Mobile keyboard GIF support attributes
                  inputMode="text"
                  data-accept="image/*,image/gif,image/webp,video/*"
                  data-capture="environment"
                />
              </div>

              <Button
                type="submit"
                className="bg-[var(--discord-blurple)] hover:bg-[var(--discord-blurple)]/80 text-white p-2 shrink-0 flex items-center justify-center"
                title="Gönder"
                disabled={sendMessageMutation.isPending || (selectedMedia.length === 0 && !message.trim())}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </form>
          </div>
          
          {/* File Upload Area */}
          {showFileUpload && (
            <FileUploadArea onFileUpload={handleFileUpload} />
          )}
          
          {/* Media Preview Component */}
          <MediaPreview
            mediaFiles={selectedMedia}
            onRemove={removeMediaFile}
            onClear={clearAllMedia}
          />
        </div>
      </div>


    </div>
  );
}