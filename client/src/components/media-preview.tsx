import { X, Play, Eye, FileText, Archive, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'document' | 'archive' | 'audio';
}

interface MediaPreviewProps {
  mediaFiles: MediaFile[];
  onRemove: (index: number) => void;
  onClear: () => void;
}

export default function MediaPreview({ mediaFiles, onRemove, onClear }: MediaPreviewProps) {
  if (mediaFiles.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-[var(--discord-darker)]/50 to-[var(--discord-dark)]/30 border border-[var(--discord-light)]/10 rounded-lg mx-3 mb-3 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[var(--discord-light)] font-medium flex items-center">
          <Eye className="w-4 h-4 mr-2 text-[var(--discord-blurple)]" />
          Seçilen dosyalar ({mediaFiles.length}/20)
        </span>
        <Button
          onClick={onClear}
          variant="ghost"
          size="sm"
          className="text-[var(--discord-light)]/70 hover:text-red-400 h-7 px-2 rounded-md transition-colors"
        >
          <X className="w-4 h-4 mr-1" />
          Temizle
        </Button>
      </div>
      
      <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[var(--discord-blurple)]/30">
        {mediaFiles.map((media, index) => (
          <div key={index} className="relative flex-shrink-0 group">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-[var(--discord-darker)] to-[var(--discord-dark)] border-2 border-[var(--discord-light)]/10 hover:border-[var(--discord-blurple)]/50 transition-all duration-200 relative shadow-lg">
              {media.type === 'image' ? (
                <img
                  src={media.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : media.type === 'video' ? (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <video
                    src={media.preview}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <Play className="absolute inset-0 m-auto w-6 h-6 text-white/70" />
                </div>
              ) : media.type === 'audio' ? (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                  <Music className="w-8 h-8 text-white" />
                </div>
              ) : media.type === 'archive' ? (
                <div className="w-full h-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center">
                  <Archive className="w-8 h-8 text-white" />
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white" />
                </div>
              )}
              
              {/* Remove button */}
              <Button
                onClick={() => onRemove(index)}
                variant="ghost"
                size="sm"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0 flex items-center justify-center border-2 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <X className="w-3 h-3" />
              </Button>
              
              {/* File type indicator */}
              <div className="absolute bottom-1 right-1">
                <div className="bg-gradient-to-r from-[var(--discord-blurple)] to-purple-600 rounded-full px-2 py-1 shadow-md">
                  <span className="text-xs text-white font-bold uppercase tracking-wide">
                    {media.type === 'image' ? '🖼️' : 
                     media.type === 'video' ? '🎥' :
                     media.type === 'audio' ? '🎵' :
                     media.type === 'archive' ? '📁' : '📄'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* File name */}
            <p className="mt-2 text-xs text-[var(--discord-light)]/70 truncate w-24 text-center" title={media.file.name}>
              {media.file.name.length > 12 ? media.file.name.substring(0, 12) + '...' : media.file.name}
            </p>
          </div>
        ))}
      </div>
      
      {/* Upload info */}
      <div className="mt-3 text-xs text-[var(--discord-light)]/50 text-center bg-[var(--discord-darker)]/30 rounded-lg py-2 px-3">
        💡 Maksimum 20 dosya • Her biri 50MB'a kadar • Tüm formatlar destekleniyor
      </div>
    </div>
  );
}