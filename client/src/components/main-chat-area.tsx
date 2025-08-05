import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Hash, Paperclip, Search, Bell, Plus, Smile, Send } from "lucide-react";
import MessageItem from "@/components/message-item";
import FileUploadArea from "@/components/file-upload-area";
import type { Room, User, MessageWithUser } from "@shared/schema";

interface MainChatAreaProps {
  currentRoom: Room;
  currentUser: User;
}

export default function MainChatArea({ currentRoom, currentUser }: MainChatAreaProps) {
  const [message, setMessage] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["/api/rooms", currentRoom.id, "messages"],
    refetchInterval: 3000, // Refetch every 3 seconds for real-time updates
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    sendMessageMutation.mutate({
      roomId: currentRoom.id,
      userId: currentUser.id,
      content: message.trim(),
      messageType: "text",
    });

    setMessage("");
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileUpload = (fileInfo: any) => {
    const messageType = fileInfo.mimetype.startsWith('image/') ? 'image' : 
                       fileInfo.mimetype.startsWith('video/') ? 'video' : 'file';
    
    sendMessageMutation.mutate({
      roomId: currentRoom.id,
      userId: currentUser.id,
      messageType,
      fileName: fileInfo.originalName,
      filePath: fileInfo.path,
      fileSize: fileInfo.size,
    });

    setShowFileUpload(false);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    if (e.target.value.length > 0 && !isTyping) {
      setIsTyping(true);
    } else if (e.target.value.length === 0 && isTyping) {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--discord-dark)]">
      {/* Chat Header */}
      <div className="h-16 border-b border-[var(--discord-darker)] flex items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          <Hash className="text-[var(--discord-light)]/50 w-5 h-5" />
          <h3 className="font-semibold text-[var(--discord-light)]">
            {currentRoom.name}
          </h3>
          <span className="text-[var(--discord-light)]/50 text-sm">|</span>
          <span className="text-[var(--discord-light)]/70 text-sm">
            {currentRoom.description}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-darker)]"
            title="Dosya Paylaş"
            onClick={() => setShowFileUpload(!showFileUpload)}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-darker)]"
            title="Arama"
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-darker)]"
            title="Bildirimler"
          >
            <Bell className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Array.isArray(messages) && messages.map((msg: MessageWithUser) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-2 text-[var(--discord-light)]/70 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-[var(--discord-light)]/50 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-[var(--discord-light)]/50 rounded-full animate-bounce-delay-1"></div>
              <div className="w-2 h-2 bg-[var(--discord-light)]/50 rounded-full animate-bounce-delay-2"></div>
            </div>
            <span>Birisi yazıyor...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-[var(--discord-darker)]">
        <div className="bg-[var(--discord-darker)] rounded-xl">
          <form onSubmit={handleSubmit} className="flex items-end p-3 space-x-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-dark)] p-2"
              title="Dosya Ekle"
              onClick={() => setShowFileUpload(!showFileUpload)}
            >
              <Plus className="w-5 h-5" />
            </Button>
            
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-[var(--discord-light)] placeholder:text-[var(--discord-light)]/50 resize-none border-none focus:ring-0 focus:outline-none min-h-0 p-0"
                placeholder={`#${currentRoom.name} kanalına mesaj gönder`}
                rows={1}
                disabled={sendMessageMutation.isPending}
              />
            </div>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-dark)] p-2"
              title="Emoji"
            >
              <Smile className="w-5 h-5" />
            </Button>
            
            <Button
              type="submit"
              className="bg-[var(--discord-blurple)] hover:bg-[var(--discord-blurple)]/80 text-white p-2"
              title="Gönder"
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
        
        {/* File Upload Area */}
        {showFileUpload && (
          <FileUploadArea onFileUpload={handleFileUpload} />
        )}
      </div>
    </div>
  );
}
