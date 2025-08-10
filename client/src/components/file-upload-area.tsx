import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";

interface FileUploadAreaProps {
  onFileUpload: (file: File) => void;
}

export default function FileUploadArea({ onFileUpload }: FileUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleButtonClick}
      className="h-8 w-8 p-0 text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-dark)]/50"
      title="Dosya ekle"
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
      />
      <Paperclip className="h-4 w-4" />
    </Button>
  );
}
