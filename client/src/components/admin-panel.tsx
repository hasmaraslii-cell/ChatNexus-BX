import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Plus, Trash2, Settings, Crown } from "lucide-react";
import type { User, Room } from "@shared/schema";

interface AdminPanelProps {
  currentUser: User;
  rooms: Room[];
}

export default function AdminPanel({ currentUser, rooms }: AdminPanelProps) {
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createRoomMutation = useMutation({
    mutationFn: async (roomData: { name: string; description?: string; userId: string }) => {
      const response = await apiRequest("POST", "/api/rooms", roomData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Yeni kanal oluşturuldu",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setIsCreateRoomOpen(false);
      setRoomName("");
      setRoomDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Kanal oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await apiRequest("DELETE", `/api/rooms/${roomId}`, {
        userId: currentUser.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Kanal silindi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Kanal silinemedi",
        variant: "destructive",
      });
    },
  });

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      toast({
        title: "Hata",
        description: "Kanal adı gerekli",
        variant: "destructive",
      });
      return;
    }

    createRoomMutation.mutate({
      name: roomName.trim().toLowerCase().replace(/\s+/g, '-'),
      description: roomDescription.trim() || undefined,
      userId: currentUser.id,
    });
  };

  const handleDeleteRoom = (roomId: string, roomName: string) => {
    if (confirm(`"${roomName}" kanalını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      deleteRoomMutation.mutate(roomId);
    }
  };

  // Don't show admin panel if user is not admin
  if (!currentUser.isAdmin) {
    return null;
  }

  return (
    <div className="border-t border-[var(--discord-dark)] p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Crown className="w-4 h-4 text-[var(--discord-yellow)]" />
          <span className="text-xs font-semibold text-[var(--discord-yellow)]">
            YÖNETİCİ PANELİ
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {/* Create Room Button */}
        <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-dark)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Kanal Oluştur
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--discord-darker)] border-[var(--discord-dark)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--discord-light)]">
                Yeni Kanal Oluştur
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <Label className="text-[var(--discord-light)]">Kanal Adı</Label>
                <Input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="bg-[var(--discord-darkest)] border-[var(--discord-dark)] text-[var(--discord-light)]"
                  placeholder="örnek: genel-sohbet"
                  disabled={createRoomMutation.isPending}
                />
              </div>
              <div>
                <Label className="text-[var(--discord-light)]">Açıklama (İsteğe bağlı)</Label>
                <Textarea
                  value={roomDescription}
                  onChange={(e) => setRoomDescription(e.target.value)}
                  className="bg-[var(--discord-darkest)] border-[var(--discord-dark)] text-[var(--discord-light)]"
                  placeholder="Bu kanal hakkında..."
                  disabled={createRoomMutation.isPending}
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  className="bg-[var(--discord-blurple)] hover:bg-[var(--discord-blurple)]/80"
                  disabled={createRoomMutation.isPending}
                >
                  {createRoomMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateRoomOpen(false)}
                  disabled={createRoomMutation.isPending}
                  className="text-[var(--discord-light)]"
                >
                  İptal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Room Management */}
        <div className="space-y-1">
          <p className="text-xs text-[var(--discord-light)]/50 px-2">Kanal Yönetimi</p>
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-[var(--discord-dark)]">
              <span className="text-xs text-[var(--discord-light)]/70 truncate">
                #{room.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-1"
                title={`${room.name} kanalını sil`}
                onClick={() => handleDeleteRoom(room.id, room.name)}
                disabled={deleteRoomMutation.isPending}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}