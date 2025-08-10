import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Copy, Reply, Download, User, Edit, Trash2, MoreHorizontal, Mic, Eye } from "lucide-react";
import ImagePreviewModal from "@/components/image-preview-modal";
// Components removed - implementing features directly
import type { MessageWithUser, User as UserType } from "@shared/schema";

interface MessageItemProps {
  message: MessageWithUser;
  currentUser?: UserType;
  onReply?: (message: MessageWithUser) => void;
  allMessages?: MessageWithUser[];
  onStartDM?: (user: UserType) => void;
}

export default function MessageItem({ message, currentUser, onReply, allMessages = [], onStartDM }: MessageItemProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
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

  // Touch handlers for swipe-to-reply
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startX) return;
    
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const deltaX = currentX - startX;
    
    // Only allow right swipe (positive deltaX)
    if (deltaX > 0 && deltaX < 100) {
      setSwipeDistance(deltaX);
      setIsDragging(true);
    }
  };

  const handleTouchEnd = () => {
    if (swipeDistance > 50 && onReply) {
      onReply(message);
    }
    
    setSwipeDistance(0);
    setStartX(0);
    setIsDragging(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
  };

  const handlePollVote = async (optionIndex: number) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`/api/messages/${message.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex, userId: currentUser.id }),
      });
      
      if (!response.ok) throw new Error("Oy verilemedi");
      
      // Refresh messages to show updated poll results
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", message.roomId, "messages"] });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Oy verilemedi",
        variant: "destructive",
      });
    }
  };

  const handleDelete = () => {
    if (window.confirm("Bu mesajı silmek istediğinizden emin misiniz?")) {
      deleteMessageMutation.mutate();
    }
  };

  const renderContentWithMarkdown = (content: string) => {
    // Regex patterns for different markdown elements
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+|(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.(?:com|org|net|edu|gov|mil|int|co|io|ly|me|app|dev|tech|info|biz|name|pro|tv|cc|us|uk|de|fr|jp|cn|in|au|ca|br|ru|it|es|nl|se|no|dk|fi|pl|cz|sk|hu|hr|rs|bg|ro|gr|tr|il|ae|sa|eg|za|ng|ke|ma|gh|tn|dz|ly|sd|et|ug|rw|tz|mw|zm|zw|bw|na|sz|ls|mz|mg|mu|sc|km|dj|so|er|cf|td|cm|gq|ga|cg|cd|ao|st|gw|gn|sl|lr|ci|gh|bf|ml|ne|sn|gm|gw|cv|mr|eh)\b[^\s<>"{}|\\^`[\]]*)/gi;
    const boldRegex = /\*\*(.*?)\*\*/g;
    const italicRegex = /\*(.*?)\*/g;
    const mentionRegex = /@(\w+)/g;
    const lineBreakRegex = /\n/g;
    
    const elements: React.ReactNode[] = [];
    let remainingContent = content;
    let keyCounter = 0;
    
    // Process line breaks first - split by newlines
    const lines = remainingContent.split('\n');
    
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        elements.push(<br key={`br-${keyCounter++}`} />);
      }
      
      let currentLine = line;
      const lineElements: React.ReactNode[] = [];
      
      // Process markdown links first [text](url)
      const markdownMatches = Array.from(currentLine.matchAll(markdownLinkRegex));
      if (markdownMatches.length > 0) {
        let lastIndex = 0;
        markdownMatches.forEach((match, matchIndex) => {
          // Add text before the link
          if (match.index! > lastIndex) {
            lineElements.push(
              <span key={`text-before-${keyCounter++}`}>
                {currentLine.slice(lastIndex, match.index)}
              </span>
            );
          }
          
          // Add the markdown link
          const linkText = match[1];
          const linkUrl = match[2].startsWith('http') ? match[2] : `https://${match[2]}`;
          lineElements.push(
            <a
              key={`markdown-link-${keyCounter++}`}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--discord-blurple)] hover:text-[var(--discord-blurple)]/80 hover:underline font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {linkText}
            </a>
          );
          
          lastIndex = match.index! + match[0].length;
        });
        
        // Add remaining text
        if (lastIndex < currentLine.length) {
          currentLine = currentLine.slice(lastIndex);
        } else {
          currentLine = '';
        }
      }
      
      if (currentLine) {
        // Process regular URLs
        const urlSplits = currentLine.split(urlRegex);
        urlSplits.forEach((segment, segmentIndex) => {
          if (urlRegex.test(segment)) {
            const href = segment.startsWith('http') ? segment : `https://${segment}`;
            lineElements.push(
              <a
                key={`url-${keyCounter++}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--discord-blurple)] hover:text-[var(--discord-blurple)]/80 hover:underline break-all inline-block font-medium transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {segment}
              </a>
            );
          } else if (segment) {
            // Process bold, italic, and mentions in text segments
            let processedSegment = segment;
            const textElements: React.ReactNode[] = [];
            
            // Split by bold first
            const boldSplits = processedSegment.split(boldRegex);
            boldSplits.forEach((boldPart, boldIndex) => {
              if (boldIndex % 2 === 1) {
                // This is bold text
                textElements.push(
                  <strong key={`bold-${keyCounter++}`} className="font-bold">
                    {boldPart}
                  </strong>
                );
              } else if (boldPart) {
                // Process italic and mentions in non-bold text
                const italicSplits = boldPart.split(italicRegex);
                italicSplits.forEach((italicPart, italicIndex) => {
                  if (italicIndex % 2 === 1) {
                    // This is italic text
                    textElements.push(
                      <em key={`italic-${keyCounter++}`} className="italic">
                        {italicPart}
                      </em>
                    );
                  } else if (italicPart) {
                    // Process mentions in regular text
                    const mentionSplits = italicPart.split(mentionRegex);
                    mentionSplits.forEach((mentionPart, mentionIndex) => {
                      if (mentionIndex % 2 === 1) {
                        textElements.push(
                          <span
                            key={`mention-${keyCounter++}`}
                            className="bg-[var(--discord-blurple)]/20 text-[var(--discord-blurple)] px-1.5 py-0.5 rounded-md text-sm font-semibold hover:bg-[var(--discord-blurple)]/30 transition-colors cursor-pointer"
                          >
                            @{mentionPart}
                          </span>
                        );
                      } else if (mentionPart) {
                        textElements.push(
                          <span key={`text-${keyCounter++}`}>
                            {mentionPart}
                          </span>
                        );
                      }
                    });
                  }
                });
              }
            });
            
            lineElements.push(...textElements);
          }
        });
      }
      
      elements.push(...lineElements);
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
      ref={messageRef}
      className="message-group flex items-start space-x-3 p-2 rounded-lg transition-all duration-200 group hover:bg-[var(--discord-dark)]/30 dark:hover:bg-[var(--discord-dark)]/30"
      style={{ transform: `translateX(${swipeDistance}px)` }}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* User Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md ${getUserColor(message.user.id)}`}>
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
        {/* Reply Preview */}
        {message.replyTo && (
          <div className="mb-3 ml-1 px-3 py-2 bg-gradient-to-r from-[var(--discord-blurple)]/10 to-transparent border-l-2 border-[var(--discord-blurple)] rounded-r-md">
            <div className="flex items-center space-x-2 mb-2">
              <Reply className="w-3 h-3 text-[var(--discord-blurple)]" />
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                {message.replyTo.user.profileImage ? (
                  <img src={message.replyTo.user.profileImage} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-bold">{message.replyTo.user.username.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="text-xs font-medium text-[var(--discord-blurple)]">
                {message.replyTo.user.username}
              </span>
            </div>
            <div className="pl-5">
              <p className="text-sm text-[var(--discord-light)]/80 line-clamp-2">
                {message.replyTo.content || (
                  message.replyTo.messageType === "voice" ? "🎤 Sesli mesaj" :
                  message.replyTo.messageType === "image" ? "🖼️ Resim" :
                  message.replyTo.messageType === "gif" ? "🎭 GIF" :
                  message.replyTo.messageType === "file" ? "📁 Dosya" : "Medya mesajı"
                )}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-baseline space-x-2 mb-1">
          <span 
            className="font-semibold text-[var(--discord-light)] hover:underline cursor-pointer"
            onClick={() => {
              if (onStartDM && currentUser?.id !== message.user.id) {
                onStartDM(message.user);
              }
            }}
          >
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
              <p className="text-[var(--discord-light)] leading-relaxed whitespace-pre-wrap">
                {renderContentWithMarkdown(message.content)}
              </p>
            )}
          </div>
        )}
        
        {/* Image Content */}
        {message.messageType === "image" && message.filePath && (
          <div className="bg-[var(--discord-darker)] rounded-lg p-2 max-w-md mb-3">
            <div className="relative group cursor-pointer" onClick={() => setShowImagePreview(true)}>
              <img 
                src={message.filePath} 
                alt={message.fileName || "Image"}
                className="rounded-lg w-full h-auto max-h-96 object-contain transition-opacity duration-200 group-hover:opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 rounded-lg">
                <Eye className="w-8 h-8 text-white" />
              </div>
            </div>
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
        
        {/* GIF Content */}
        {message.messageType === "gif" && message.filePath && (
          <div className="bg-[var(--discord-darker)] rounded-lg p-2 max-w-md mb-3">
            <div className="relative group cursor-pointer" onClick={() => setShowImagePreview(true)}>
              <img 
                src={message.filePath} 
                alt={message.fileName || "GIF"}
                className="rounded-lg w-full h-auto max-h-96 object-contain transition-opacity duration-200 group-hover:opacity-80"
              />
              <div className="absolute top-2 left-2 bg-[var(--discord-blurple)] text-white text-xs px-2 py-1 rounded-full font-bold">
                GIF
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 rounded-lg">
                <Eye className="w-8 h-8 text-white" />
              </div>
            </div>
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
        
        {/* Voice Message - Discord Style */}

        
        {/* File Group Display for multiple files */}
        {message.fileGroupId && allMessages && (() => {
          const groupMessages = allMessages.filter(msg => msg.fileGroupId === message.fileGroupId);
          const isFirstInGroup = groupMessages[0]?.id === message.id;
          
          if (!isFirstInGroup) return null;
          
          return (
            <div className="bg-[var(--discord-darker)]/30 rounded-lg p-3 border border-[var(--discord-dark)] mb-2">
              <div className="text-xs text-[var(--discord-light)]/70 mb-2">
                {groupMessages.length} dosya paylaşıldı
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {groupMessages.map((fileMsg) => (
                  <div key={fileMsg.id} className="bg-[var(--discord-dark)] rounded p-2 text-center">
                    <div className="text-xs text-[var(--discord-light)]/70 truncate">
                      {fileMsg.fileName}
                    </div>
                    <div className="text-xs text-[var(--discord-light)]/50">
                      {fileMsg.fileSize ? `${(fileMsg.fileSize / (1024 * 1024)).toFixed(1)} MB` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        
        {message.messageType === "voice" && message.filePath && (
          <div className="bg-gradient-to-r from-[#5865f2]/10 to-[#7983f5]/5 border border-[#5865f2]/20 rounded-lg p-4 max-w-sm mb-3 shadow-sm backdrop-blur-sm">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-[#5865f2] to-[#7983f5] rounded-full flex items-center justify-center shadow-md animate-pulse">
                  <Mic className="text-white w-5 h-5" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--discord-darker)]"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[var(--discord-light)] flex items-center">
                    <span className="w-2 h-2 bg-[#5865f2] rounded-full mr-2 animate-pulse"></span>
                    Sesli Mesaj
                  </span>
                  <span className="text-xs text-[var(--discord-light)]/50">🎵</span>
                </div>
                <div className="bg-[var(--discord-dark)]/50 rounded-lg p-2 border border-[var(--discord-light)]/10">
                  <audio 
                    controls 
                    className="w-full h-8 rounded-md"
                    controlsList="nodownload noremoteplayback"
                    style={{
                      filter: 'hue-rotate(240deg) saturate(1.3) brightness(1.1)',
                      accentColor: '#5865f2'
                    }}
                  >
                    <source src={message.filePath} type="audio/webm" />
                    <source src={message.filePath} type="audio/wav" />
                    <source src={message.filePath} type="audio/mp3" />
                    <source src={message.filePath} type="audio/ogg" />
                    Tarayıcınız ses oynatmayı desteklemiyor.
                  </audio>
                </div>
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
          <DropdownMenuContent className="bg-[var(--discord-darker)] border-[var(--discord-dark)] shadow-xl rounded-lg p-1 min-w-[180px]">
            <DropdownMenuItem
              onClick={handleReply}
              className="text-[var(--discord-light)] hover:bg-[var(--discord-blurple)]/20 hover:text-[var(--discord-blurple)] rounded-md px-3 py-2 cursor-pointer transition-colors flex items-center"
            >
              <Reply className="w-4 h-4 mr-3" />
              <span className="font-medium">Yanıtla</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleCopyMessage}
              className="text-[var(--discord-light)] hover:bg-gray-200 dark:hover:bg-[var(--discord-dark)] rounded-md px-3 py-2 cursor-pointer transition-colors flex items-center"
            >
              <Copy className="w-4 h-4 mr-3" />
              <span className="font-medium">Kopyala</span>
            </DropdownMenuItem>
            {message.userId === currentUser?.id && (
              <DropdownMenuItem
                onClick={handleEdit}
                className="text-[var(--discord-light)] hover:bg-gray-200 dark:hover:bg-[var(--discord-dark)] rounded-md px-3 py-2 cursor-pointer transition-colors flex items-center"
              >
                <Edit className="w-4 h-4 mr-3" />
                <span className="font-medium">Düzenle</span>
              </DropdownMenuItem>
            )}
            {(message.userId === currentUser?.id || currentUser?.isAdmin) && (
              <>
                <div className="h-px bg-[var(--discord-dark)] my-1 mx-2"></div>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-md px-3 py-2 cursor-pointer transition-colors flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-3" />
                  <span className="font-medium">Sil</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Image Preview Modal */}
      {showImagePreview && message.messageType === "image" && message.filePath && (
        <ImagePreviewModal
          isOpen={showImagePreview}
          onClose={() => setShowImagePreview(false)}
          images={[{
            src: message.filePath,
            alt: message.fileName || "Image",
            fileName: message.fileName || undefined,
            filePath: message.filePath || undefined,
          }]}
          initialIndex={0}
        />
      )}
    </div>
  );
}
