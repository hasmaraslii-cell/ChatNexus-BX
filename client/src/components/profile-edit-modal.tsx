import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { User as UserType } from "@shared/schema";

interface ProfileEditModalProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: (updatedUser: UserType) => void;
}

export default function ProfileEditModal({ user, isOpen, onClose, onProfileUpdate }: ProfileEditModalProps) {
  const [username, setUsername] = useState(user?.username || "");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.profileImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { username: string; profileImage?: string }) => {
      const response = await fetch(`/api/users/${user?.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Profil güncellenemedi");
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update localStorage with the new user data
      localStorage.setItem("ibx-user", JSON.stringify(updatedUser));
      
      // Call the callback to update parent component state
      onProfileUpdate?.(updatedUser);
      
      toast({
        title: "Başarılı",
        description: "Profil başarıyla güncellendi",
      });
      
      // Invalidate all user-related queries to sync everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/users/online"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/offline"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      // Force refresh of messages to show updated profile in all messages
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Profil güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Hata",
          description: "Dosya boyutu 5MB'dan büyük olamaz",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Hata",
          description: "Sadece resim dosyaları kabul edilir",
          variant: "destructive",
        });
        return;
      }

      setProfileImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('files', file); // Changed from 'file' to 'files'

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Dosya yüklenemedi');
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0].path : result.path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Hata",
        description: "Kullanıcı adı boş olamaz",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      let profileImagePath = user?.profileImage;
      
      if (profileImageFile) {
        profileImagePath = await uploadImage(profileImageFile);
      }

      await updateProfileMutation.mutateAsync({
        username: username.trim(),
        profileImage: profileImagePath || undefined,
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Profil güncellenemedi",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setUsername(user?.username || "");
    setProfileImageFile(null);
    setPreviewUrl(user?.profileImage || null);
    onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[var(--discord-darker)] border-[var(--discord-dark)]" aria-describedby="profile-description">
        <DialogHeader>
          <DialogTitle className="text-[var(--discord-light)]">
            Profili Düzenle
          </DialogTitle>
          <div id="profile-description" className="sr-only">
            Kullanıcı adınızı ve profil fotoğrafınızı güncelleyin
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center overflow-hidden ${getUserColor(user?.id || "")}`}>
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="text-white w-8 h-8" />
                )}
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="w-6 h-6 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
            <p className="text-xs text-[var(--discord-light)]/50 text-center">
              Profil resminizi değiştirmek için tıklayın
            </p>
          </div>

          {/* Username Section */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-[var(--discord-light)]">
              Kullanıcı Adı
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-[var(--discord-dark)] border-[var(--discord-light)]/20 text-[var(--discord-light)]"
              placeholder="Kullanıcı adınızı girin"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)]"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending || isUploading}
              className="bg-[var(--discord-blurple)] hover:bg-[var(--discord-blurple)]/80"
            >
              {(updateProfileMutation.isPending || isUploading) ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}