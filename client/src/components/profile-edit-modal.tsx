import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { User as UserType } from "@shared/schema";

interface ProfileEditModalProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: (updatedUser: UserType) => void;
}

export default function ProfileEditModal({ user, isOpen, onClose, onProfileUpdate }: ProfileEditModalProps) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.profileImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName: string; profileImage?: string }) => {
      const response = await fetch(`/api/users/${user?.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Profil güncellenemedi");
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      onProfileUpdate?.(updatedUser);
      toast({ title: "Başarılı", description: "Profil başarıyla güncellendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/users/online"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/offline"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Profil güncellenemedi", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Hata", description: "Dosya boyutu 5MB'dan büyük olamaz", variant: "destructive" });
        return;
      }
      setProfileImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('files', file);
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Dosya yüklenemedi');
    const result = await response.json();
    return Array.isArray(result) ? result[0].path : result.path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast({ title: "Hata", description: "Görünen ad boş olamaz", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      let profileImagePath = user?.profileImage;
      if (profileImageFile) profileImagePath = await uploadImage(profileImageFile);
      await updateProfileMutation.mutateAsync({ displayName: displayName.trim(), profileImage: profileImagePath || undefined });
    } catch (error) {
      toast({ title: "Hata", description: "Profil güncellenemedi", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#1e1f22] border-white/5 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-white font-black tracking-tight">PROFİLİ DÜZENLE</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-white/10 shadow-2xl">
                <AvatarImage src={previewUrl || ""} className="object-cover" />
                <AvatarFallback className="bg-slate-800 text-2xl font-black">
                  {displayName.charAt(0).toUpperCase() || user?.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="w-6 h-6 text-white" />
                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resmi Değiştir</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Görünen Ad</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-slate-900 border-white/10 text-white focus:border-blue-500 h-10" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updateProfileMutation.isPending || isUploading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-6 rounded-xl">
              {(updateProfileMutation.isPending || isUploading) ? "Kaydediliyor..." : "DEĞİŞİKLİKLERİ KAYDET"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
