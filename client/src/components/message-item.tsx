import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Reply, Download, Play, User } from "lucide-react";
import type { MessageWithUser } from "@shared/schema";

interface MessageItemProps {
  message: MessageWithUser;
}

export default function MessageItem({ message }: MessageItemProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const formatTime = (date: Date | null) => {
    if (!date) return "şimdi";
    return new Date(date).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
    <div className="message-group flex items-start space-x-3 p-2 rounded-lg transition-colors">
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
        </div>
        
        {/* Text Content */}
        {message.content && (
          <p className="text-[var(--discord-light)] leading-relaxed mb-3">
            {message.content}
          </p>
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
      <div className="opacity-0 group-hover:opacity-100 flex space-x-1 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="text-[var(--discord-light)]/50 hover:text-[var(--discord-light)] p-1"
          title="Kopyala"
          onClick={handleCopyMessage}
        >
          <Copy className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-[var(--discord-light)]/50 hover:text-[var(--discord-light)] p-1"
          title="Yanıtla"
        >
          <Reply className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
