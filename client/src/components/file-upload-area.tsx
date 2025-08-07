import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CloudUpload, X } from "lucide-react";

interface FileUploadAreaProps {
  onFileUpload: (fileInfo: any) => void;
  onMultipleFileUpload?: (fileInfos: any[]) => void;
}

export default function FileUploadArea({ onFileUpload, onMultipleFileUpload }: FileUploadAreaProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (fileInfo) => {
      onFileUpload(fileInfo);
      toast({
        title: "Başarılı",
        description: "Dosya başarıyla yüklendi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Dosya yüklenemedi",
        variant: "destructive",
      });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const fileArray = files.slice(0, 20);
      
      if (fileArray.length === 1) {
        // Single file - upload as before
        handleFileUpload(fileArray[0]);
      } else {
        // Multiple files - group like WhatsApp
        handleMultipleFilesUpload(fileArray);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files).slice(0, 20);
      
      if (fileArray.length === 1) {
        // Single file - upload as before
        handleFileUpload(fileArray[0]);
      } else {
        // Multiple files - group like WhatsApp
        handleMultipleFilesUpload(fileArray);
      }
    }
  };

  const handleFileUpload = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Hata",
        description: "Dosya boyutu 50MB'dan büyük olamaz",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleMultipleFilesUpload = async (files: File[]) => {
    setUploadingFiles(files.map(f => f.name));
    
    try {
      const uploadedFiles: any[] = [];
      
      // Upload all files
      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) {
          toast({
            title: "Hata",
            description: `${file.name} dosyası 50MB'dan büyük`,
            variant: "destructive",
          });
          continue;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const fileInfo = await response.json();
          uploadedFiles.push(fileInfo);
        }
      }
      
      if (uploadedFiles.length > 0) {
        if (onMultipleFileUpload) {
          onMultipleFileUpload(uploadedFiles);
        } else {
          // Fallback to individual uploads
          uploadedFiles.forEach(fileInfo => onFileUpload(fileInfo));
        }
        
        toast({
          title: "Başarılı",
          description: `${uploadedFiles.length} dosya yüklendi`,
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Dosyalar yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles([]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mt-3">
      <div
        className={`file-drop-zone p-4 border-2 border-dashed rounded-xl text-center transition-colors ${
          dragOver 
            ? "border-[var(--discord-blurple)] bg-[var(--discord-blurple)]/10" 
            : "border-[var(--discord-light)]/30"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          multiple
          disabled={uploadMutation.isPending}
        />
        
        <div className="space-y-2">
          {(uploadMutation.isPending || uploadingFiles.length > 0) ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--discord-blurple)] mx-auto"></div>
              <p className="text-[var(--discord-light)]/70">
                {uploadingFiles.length > 1 
                  ? `${uploadingFiles.length} dosya yükleniyor...`
                  : "Dosya yükleniyor..."
                }
              </p>
            </>
          ) : (
            <>
              <CloudUpload className="text-3xl text-[var(--discord-light)]/50 w-8 h-8 mx-auto" />
              <p className="text-[var(--discord-light)]/70">
                Dosyalarını buraya sürükle veya{" "}
                <Button
                  type="button"
                  variant="link"
                  className="text-[var(--discord-blurple)] hover:underline p-0 h-auto"
                  onClick={handleButtonClick}
                  disabled={uploadMutation.isPending}
                >
                  tıkla
                </Button>
              </p>
              <p className="text-xs text-[var(--discord-light)]/50">
                Maksimum 50MB, 20 dosyaya kadar - Resim, video, doküman desteklenir
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
