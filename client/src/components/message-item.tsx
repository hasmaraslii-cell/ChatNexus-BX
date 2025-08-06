import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Copy, Reply, Download, User, Edit, Trash2, MoreHorizontal, Mic } from "lucide-react";
import type { MessageWithUser, User as UserType } from "@shared/schema";

interface MessageItemProps {
  message: MessageWithUser;
  currentUser?: UserType;
  onReply?: (message: MessageWithUser) => void;
}

export default function MessageItem({ message, currentUser, onReply }: MessageItemProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");
  const [showContextMenu, setShowContextMenu] = useState(false);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const formatTime = (date: Date | null) => {
    if (!date) return "şimdi";
    return new Date(date).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const editMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, userId: currentUser?.id }),
      });
      if (!response.ok) throw new Error("Mesaj güncellenemedi");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Mesaj güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/rooms/${message.roomId}/messages`] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Mesaj güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/messages/${message.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser?.id }),
      });
      if (!response.ok) throw new Error("Mesaj silinemedi");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Mesaj silindi",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/rooms/${message.roomId}/messages`] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Mesaj silinemedi",
        variant: "destructive",
      });
    },
  });

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content || "");
      toast({
        title: "Kopyalandı",
        description: "Mesaj panoya kopyalandı",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Mesaj kopyalanamadı",
        variant: "destructive",
      });
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content || "");
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      editMessageMutation.mutate(editContent.trim());
    } else {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content || "");
  };

  const handleDelete = () => {
    if (window.confirm("Bu mesajı silmek istediğinizden emin misiniz?")) {
      deleteMessageMutation.mutate();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
  };

  const handleTouchStart = () => {
    touchTimeoutRef.current = setTimeout(() => {
      setShowContextMenu(true);
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
  };

  const renderContentWithLinks = (content: string) => {
    // Enhanced URL regex for better link detection
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
    const mentionRegex = /@(\w+)/g;
    
    const elements: React.ReactNode[] = [];
    let currentIndex = 0;
    
    // Split by URLs first
    const urlSplits = content.split(urlRegex);
    
    urlSplits.forEach((segment, segmentIndex) => {
      if (urlRegex.test(segment)) {
        // This is a URL
        elements.push(
          <a
            key={`url-${segmentIndex}`}
            href={segment}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--discord-blurple)] hover:underline break-all inline-block"
            onClick={(e) => e.stopPropagation()}
          >
            {segment}
          </a>
        );
      } else {
        // Process mentions in non-URL segments
        const mentionSplits = segment.split(mentionRegex);
        mentionSplits.forEach((part, partIndex) => {
          if (partIndex % 2 === 1) {
            // This is a mention (odd indices after split)
            elements.push(
              <span
                key={`mention-${segmentIndex}-${partIndex}`}
                className="bg-[var(--discord-blurple)]/20 text-[var(--discord-blurple)] px-1 py-0.5 rounded text-sm font-medium"
              >
                @{part}
              </span>
            );
          } else if (part) {
            // Regular text
            elements.push(
              <span key={`text-${segmentIndex}-${partIndex}`}>
                {part}
              </span>
            );
          }
        });
      }
    });
    
    return elements;
  };

  const canEdit = currentUser && (message.user.id === currentUser.id || currentUser.isAdmin);
  const canDelete = currentUser && (message.user.id === currentUser.id || currentUser.isAdmin);

  const handleDownloadFile = async () => {
    if (!message.fileName) return;
    
    setIsDownloading(true);
    try {
      const filename = message.filePath?.split('/').pop() || message.fileName;
      const response = await fetch(`/api/download/${filename}`);
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = message.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "İndirildi",
        description: "Dosya başarıyla indirildi",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Dosya indirilemedi",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const getUserColor = (userId: string) => {
    const colors = [
      "bg-green-500",
      "bg-blue-500", 
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-indigo-500",
    ];
    return colors[userId.length % colors.length];
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (message.messageType === "system") {
    return (
      <div className="flex justify-center">
        <div className="bg-[var(--discord-blurple)]/20 text-[var(--discord-blurple)] px-4 py-2 rounded-full text-sm">
          <i className="fas fa-info-circle mr-2"></i>
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="message-group flex items-start space-x-3 p-2 rounded-lg transition-colors group hover:bg-[var(--discord-dark)]/30"
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* User Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${getUserColor(message.user.id)}`}>
        {message.user.profileImage ? (
          <img 
            src={message.user.profileImage} 
            alt={message.user.username}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="text-white w-5 h-5" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline space-x-2 mb-1">
          <span className="font-semibold text-[var(--discord-light)]">
            {message.user.username}
          </span>
          <span className="text-xs text-[var(--discord-light)]/50">
            {formatTime(message.createdAt)}
          </span>
          {message.editedAt && (
            <span className="text-xs text-[var(--discord-light)]/30">(düzenlendi)</span>
          )}
        </div>
        
        {/* Text Content */}
        {message.content && (
          <div className="mb-3">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="bg-[var(--discord-dark)] border-[var(--discord-light)]/20 text-[var(--discord-light)]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveEdit();
                    }
                    if (e.key === "Escape") {
                      handleCancelEdit();
                    }
                  }}
                />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={editMessageMutation.isPending}
                    className="bg-[var(--discord-blurple)] hover:bg-[var(--discord-blurple)]/80"
                  >
                    Kaydet
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="text-[var(--discord-light)]/70"
                  >
                    İptal
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[var(--discord-light)] leading-relaxed">
                {renderContentWithLinks(message.content)}
              </p>
            )}
          </div>
        )}
        
        {/* Image Content */}
        {message.messageType === "image" && message.filePath && (
          <div className="bg-[var(--discord-darker)] rounded-lg p-2 max-w-md mb-3">
            <img 
              src={message.filePath} 
              alt={message.fileName || "Image"}
              className="rounded-lg w-full h-auto max-h-96 object-contain"
            />
            <div className="flex items-center justify-between mt-2 text-sm text-[var(--discord-light)]/70">
              <span>{message.fileName}</span>
              <Button
                variant="ghost"
                size="sm"
                className="hover:text-[var(--discord-light)] p-1"
                title="İndir"
                onClick={handleDownloadFile}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}
        
        {/* Video Content */}
        {message.messageType === "video" && message.filePath && (
          <div className="bg-[var(--discord-darker)] rounded-lg p-2 max-w-md mb-3">
            <video 
              controls
              className="rounded-lg w-full h-auto max-h-96"
              preload="metadata"
            >
              <source src={message.filePath} type="video/mp4" />
              Tarayıcınız video oynatmayı desteklemiyor.
            </video>
            <div className="flex items-center justify-between mt-2 text-sm text-[var(--discord-light)]/70">
              <span>{message.fileName}</span>
              <Button
                variant="ghost"
                size="sm"
                className="hover:text-[var(--discord-light)] p-1"
                title="İndir"
                onClick={handleDownloadFile}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}
        
        {/* Voice Message */}
        {message.messageType === "voice" && message.filePath && (
          <div className="bg-gradient-to-r from-[var(--discord-blurple)]/20 to-[var(--discord-darker)] border border-[var(--discord-blurple)]/30 rounded-lg p-4 max-w-sm mb-3 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--discord-blurple)] to-blue-600 rounded-full flex items-center justify-center shadow-md">
                <Mic className="text-white w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="mb-2">
                  <span className="text-sm font-medium text-[var(--discord-light)]">Sesli Mesaj</span>
                </div>
                <audio 
                  controls 
                  className="w-full h-10 rounded-lg"
                  controlsList="nodownload noremoteplayback"
                  style={{
                    filter: 'hue-rotate(240deg) saturate(1.2)',
                    backgroundColor: 'var(--discord-dark)'
                  }}
                >
                  <source src={message.filePath} type="audio/webm" />
                  <source src={message.filePath} type="audio/wav" />
                  <source src={message.filePath} type="audio/mp3" />
                  Tarayıcınız ses oynatmayı desteklemiyor.
                </audio>
              </div>
            </div>
          </div>
        )}

        {/* File Content */}
        {message.messageType === "file" && message.fileName && (
          <div className="bg-[var(--discord-darker)] border border-[var(--discord-light)]/20 rounded-lg p-3 max-w-xs mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-500 rounded flex items-center justify-center">
                <i className="fas fa-file text-white text-lg"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--discord-light)] truncate">
                  {message.fileName}
                </p>
                {message.fileSize && (
                  <p className="text-sm text-[var(--discord-light)]/70">
                    {formatFileSize(message.fileSize)}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] p-1"
                title="İndir"
                onClick={handleDownloadFile}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Message Actions */}
      <div className="opacity-0 group-hover:opacity-100 flex items-start transition-opacity">
        <DropdownMenu open={showContextMenu} onOpenChange={setShowContextMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--discord-light)]/50 hover:text-[var(--discord-light)] p-1"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[var(--discord-darker)] border-[var(--discord-dark)]">
            <DropdownMenuItem
              onClick={handleReply}
              className="text-[var(--discord-light)] hover:bg-[var(--discord-dark)]"
            >
              <Reply className="w-4 h-4 mr-2" />
              Yanıtla
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleCopyMessage}
              className="text-[var(--discord-light)] hover:bg-[var(--discord-dark)]"
            >
              <Copy className="w-4 h-4 mr-2" />
              Kopyala
            </DropdownMenuItem>
            {message.userId === currentUser?.id && (
              <DropdownMenuItem
                onClick={handleEdit}
                className="text-[var(--discord-light)] hover:bg-[var(--discord-dark)]"
              >
                <Edit className="w-4 h-4 mr-2" />
                Düzenle
              </DropdownMenuItem>
            )}
            {(message.userId === currentUser?.id || currentUser?.isAdmin) && (
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-400 hover:bg-[var(--discord-dark)]"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Sil
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
