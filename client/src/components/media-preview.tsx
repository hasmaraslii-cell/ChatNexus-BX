import { X, Play, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface MediaPreviewProps {
  mediaFiles: MediaFile[];
  onRemove: (index: number) => void;
  onClear: () => void;
}

export default function MediaPreview({ mediaFiles, onRemove, onClear }: MediaPreviewProps) {
  if (mediaFiles.length === 0) return null;

  return (
    <div className="border-t border-[var(--discord-darker)] bg-[var(--discord-dark)] p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[var(--discord-light)] font-medium">
          Seçilen medya dosyaları ({mediaFiles.length}/20)
        </span>
        <Button
          onClick={onClear}
          variant="ghost"
          size="sm"
          className="text-[var(--discord-light)]/70 hover:text-red-400 h-6 px-2"
        >
          <X className="w-4 h-4 mr-1" />
          Tümünü Temizle
        </Button>
      </div>
      
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {mediaFiles.map((media, index) => (
          <div key={index} className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--discord-darker)] border border-[var(--discord-darker)] relative">
              {media.type === 'image' ? (
                <img
                  src={media.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <video
                    src={media.preview}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <Play className="absolute inset-0 m-auto w-6 h-6 text-white/70" />
                </div>
              )}
              
              {/* Remove button */}
              <Button
                onClick={() => onRemove(index)}
                variant="ghost"
                size="sm"
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white p-0 flex items-center justify-center border border-[var(--discord-dark)]"
              >
                <X className="w-3 h-3" />
              </Button>
              
              {/* File type indicator */}
              <div className="absolute bottom-1 left-1">
                <div className="bg-black/60 rounded px-1 py-0.5">
                  <span className="text-xs text-white font-medium uppercase">
                    {media.type === 'image' ? 'IMG' : 'VID'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* File name */}
            <p className="mt-1 text-xs text-[var(--discord-light)]/70 truncate w-20" title={media.file.name}>
              {media.file.name}
            </p>
          </div>
        ))}
      </div>
      
      {/* Upload info */}
      <div className="mt-3 text-xs text-[var(--discord-light)]/50">
        Maksimum 20 dosya, her biri en fazla 50MB olabilir.
      </div>
    </div>
  );
}