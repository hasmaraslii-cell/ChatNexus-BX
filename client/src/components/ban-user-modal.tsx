import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface BanUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BanUserModal({ user, isOpen, onClose }: BanUserModalProps) {
  const [duration, setDuration] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const banOptions = [
    { value: "1", label: "1 Dakika" },
    { value: "10", label: "10 Dakika" },
    { value: "60", label: "1 Saat" },
    { value: "1440", label: "24 Saat" },
    { value: "permanent", label: "Sonsuz" },
    { value: "unban", label: "Ban Kaldır" },
  ];

  const banUserMutation = useMutation({
    mutationFn: async (banDuration: string | number | null) => {
      const response = await fetch(`/api/users/${user?.id}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          duration: banDuration === "unban" ? null : banDuration 
        }),
      });
      if (!response.ok) throw new Error("İşlem gerçekleştirilemedi");
      return response.json();
    },
    onSuccess: () => {
      const actionText = duration === "unban" ? "kaldırıldı" : "banlandı";
      toast({
        title: "Başarılı",
        description: `Kullanıcı başarıyla ${actionText}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/online"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/offline"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "İşlem gerçekleştirilemedi",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!duration) {
      toast({
        title: "Hata",
        description: "Lütfen bir süre seçin",
        variant: "destructive",
      });
      return;
    }

    const banDuration = duration === "permanent" ? "permanent" : 
                       duration === "unban" ? "unban" : 
                       parseInt(duration);

    banUserMutation.mutate(banDuration);
  };

  const handleClose = () => {
    setDuration("");
    onClose();
  };

  const getDurationText = () => {
    const option = banOptions.find(opt => opt.value === duration);
    return option?.label || "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[var(--discord-darker)] border-[var(--discord-dark)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--discord-light)]">
            Kullanıcı Yönetimi
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center">
            <p className="text-[var(--discord-light)] mb-2">
              <strong>{user?.username}</strong> kullanıcısı için işlem seçin:
            </p>
            {user?.bannedUntil && new Date(user.bannedUntil) > new Date() && (
              <p className="text-red-400 text-sm">
                Bu kullanıcı şu anda banlı durumda
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[var(--discord-light)] text-sm">
              Ban Süresi
            </label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-[var(--discord-dark)] border-[var(--discord-light)]/20 text-[var(--discord-light)]">
                <SelectValue placeholder="Süre seçin" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--discord-dark)] border-[var(--discord-light)]/20">
                {banOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-[var(--discord-light)] hover:bg-[var(--discord-darker)]"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {duration && (
            <div className="bg-[var(--discord-dark)] p-3 rounded-lg">
              <p className="text-[var(--discord-light)]/70 text-sm">
                <strong>Seçilen işlem:</strong> {getDurationText()}
              </p>
              {duration !== "unban" && (
                <p className="text-red-400 text-xs mt-1">
                  Bu kullanıcı {getDurationText().toLowerCase()} boyunca uygulamayı kullanamayacak.
                </p>
              )}
            </div>
          )}

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
              disabled={banUserMutation.isPending || !duration}
              className={`${
                duration === "unban" 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {banUserMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              {duration === "unban" ? "Ban Kaldır" : "Banla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}