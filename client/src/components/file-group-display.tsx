import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Image, Video, File, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import ImagePreviewModal from "@/components/image-preview-modal";
import type { MessageWithUser } from "@shared/schema";

interface FileGroupDisplayProps {
  messages: MessageWithUser[];
  fileGroupId: string;
}

export default function FileGroupDisplay({ messages, fileGroupId }: FileGroupDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImages, setPreviewImages] = useState<Array<{
    src: string;
    alt: string;
    fileName?: string;
    filePath?: string;
  }>>([]);
  
  const groupMessages = messages
    .filter(msg => msg.fileGroupId === fileGroupId)
    .sort((a, b) => (a.groupIndex || 0) - (b.groupIndex || 0));

  if (groupMessages.length === 0) return null;

  const currentMessage = groupMessages[currentIndex];
  const totalFiles = groupMessages.length;

  const handleDownload = async (message: MessageWithUser) => {
    if (!message.filePath || !message.fileName) return;
    
    try {
      const response = await fetch(`/api/files/${message.filePath}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = message.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getFileIcon = (messageType: string) => {
    switch (messageType) {
      case "image":
        return <Image className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleImageClick = (message: MessageWithUser, index: number) => {
    const imageMessages = groupMessages.filter(msg => msg.messageType === "image");
    const images = imageMessages.map(msg => ({
      src: `/api/files/${msg.filePath}`,
      alt: msg.fileName || "Image",
      fileName: msg.fileName || undefined,
      filePath: msg.filePath || undefined,
    }));
    
    const clickedImageIndex = imageMessages.findIndex(msg => msg.id === message.id);
    setPreviewImages(images);
    setCurrentIndex(clickedImageIndex >= 0 ? clickedImageIndex : 0);
    setShowImagePreview(true);
  };

  return (
    <div className="bg-[var(--discord-darker)] rounded-lg overflow-hidden mt-2 max-w-md">
      {/* File grid header */}
      <div className="bg-[var(--discord-dark)] p-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getFileIcon(currentMessage.messageType)}
          <span className="text-sm text-[var(--discord-light)]/70">
            {totalFiles} dosya
          </span>
        </div>
        <div className="text-xs text-[var(--discord-light)]/50">
          {currentIndex + 1} / {totalFiles}
        </div>
      </div>

      {/* Main file display */}
      <div className="relative">
        {currentMessage.messageType === "image" && currentMessage.filePath && (
          <div className="relative group cursor-pointer" onClick={() => handleImageClick(currentMessage, currentIndex)}>
            <img
              src={`/api/files/${currentMessage.filePath}`}
              alt={currentMessage.fileName || "Image"}
              className="w-full h-48 object-cover transition-opacity duration-200 group-hover:opacity-80"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50">
              <Eye className="w-8 h-8 text-white" />
            </div>
          </div>
        )}
        
        {currentMessage.messageType === "video" && currentMessage.filePath && (
          <video
            src={`/api/files/${currentMessage.filePath}`}
            controls
            className="w-full h-48 object-cover bg-black"
          />
        )}
        
        {!["image", "video"].includes(currentMessage.messageType) && (
          <div className="h-48 flex items-center justify-center bg-[var(--discord-dark)]">
            <div className="text-center">
              {getFileIcon(currentMessage.messageType)}
              <p className="text-sm text-[var(--discord-light)] mt-2 truncate max-w-48">
                {currentMessage.fileName || "Unknown file"}
              </p>
              <p className="text-xs text-[var(--discord-light)]/70">
                {formatFileSize(currentMessage.fileSize || 0)}
              </p>
            </div>
          </div>
        )}

        {/* Navigation arrows */}
        {totalFiles > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentIndex(Math.min(totalFiles - 1, currentIndex + 1))}
              disabled={currentIndex === totalFiles - 1}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* File info and actions */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[var(--discord-light)] truncate">
              {currentMessage.fileName || "Unknown file"}
            </p>
            <p className="text-xs text-[var(--discord-light)]/70">
              {formatFileSize(currentMessage.fileSize || 0)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(currentMessage)}
            className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] h-8 w-8 p-0 ml-2"
            title="İndir"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {/* File thumbnail grid for navigation */}
        {totalFiles > 1 && (
          <div className="flex space-x-1 mt-2 overflow-x-auto">
            {groupMessages.map((msg, index) => (
              <button
                key={msg.id}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-8 h-8 rounded border-2 overflow-hidden ${
                  index === currentIndex
                    ? "border-[var(--discord-blurple)]"
                    : "border-[var(--discord-dark)]"
                }`}
              >
                {msg.messageType === "image" && msg.filePath ? (
                  <img
                    src={`/api/files/${msg.filePath}`}
                    alt={msg.fileName || "Image"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[var(--discord-dark)] flex items-center justify-center">
                    {getFileIcon(msg.messageType)}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        images={previewImages}
        initialIndex={currentIndex}
      />
    </div>
  );
}