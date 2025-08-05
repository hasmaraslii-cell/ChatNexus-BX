import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, UserIcon, Camera } from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface UserRegistrationModalProps {
  onUserCreated: (user: UserType) => void;
}

export default function UserRegistrationModal({ onUserCreated }: UserRegistrationModalProps) {
  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const createUserMutation = useMutation({
    mutationFn: async (userData: { username: string; profileImage?: string }) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
    onSuccess: (user: UserType) => {
      toast({
        title: "Hoş geldin!",
        description: "Profil başarıyla oluşturuldu",
      });
      onUserCreated(user);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Profil oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      return response.json();
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Hata",
        description: "Kullanıcı adı gerekli",
        variant: "destructive",
      });
      return;
    }

    let profileImageUrl = undefined;
    
    if (profileImage) {
      try {
        const uploadResult = await uploadImageMutation.mutateAsync(profileImage);
        profileImageUrl = uploadResult.path;
      } catch (error) {
        toast({
          title: "Hata",
          description: "Resim yüklenemedi",
          variant: "destructive",
        });
        return;
      }
    }

    createUserMutation.mutate({
      username: username.trim(),
      profileImage: profileImageUrl,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--discord-darker)] p-8 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[var(--discord-blurple)] mb-2">
            IBX'e Hoş Geldin!
          </h1>
          <p className="text-[var(--discord-light)]/80">
            Sohbete katılmak için profil bilgilerini gir
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="block text-sm font-medium mb-2 text-[var(--discord-light)]">
              Kullanıcı Adı
            </Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[var(--discord-darkest)] border border-[var(--discord-dark)] text-[var(--discord-light)] placeholder:text-[var(--discord-light)]/50"
              placeholder="Adını gir..."
              disabled={createUserMutation.isPending}
            />
          </div>
          
          <div>
            <Label className="block text-sm font-medium mb-2 text-[var(--discord-light)]">
              Profil Resmi
            </Label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-[var(--discord-dark)] rounded-full flex items-center justify-center border-2 border-dashed border-[var(--discord-light)]/30 overflow-hidden">
                {previewUrl ? (
                  <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="text-[var(--discord-light)]/50 text-xl w-6 h-6" />
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="profileImage"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={createUserMutation.isPending}
                />
                <Button
                  type="button"
                  onClick={() => document.getElementById('profileImage')?.click()}
                  className="bg-[var(--discord-blurple)] hover:bg-[var(--discord-blurple)]/80"
                  disabled={createUserMutation.isPending}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Resim Seç
                </Button>
              </div>
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full bg-[var(--discord-green)] hover:bg-[var(--discord-green)]/80 text-white font-semibold"
            disabled={createUserMutation.isPending || uploadImageMutation.isPending}
          >
            {createUserMutation.isPending || uploadImageMutation.isPending ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Profil Oluşturuluyor...
              </div>
            ) : (
              "Sohbete Katıl"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
