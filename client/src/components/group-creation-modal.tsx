import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface GroupCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export default function GroupCreationModal({
  isOpen,
  onClose,
  currentUser
}: GroupCreationModalProps) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createGroupMutation = useMutation({
    mutationFn: async (groupData: { name: string; description?: string }) => {
      const response = await apiRequest("POST", "/api/rooms", groupData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Grup oluşturuldu",
        description: "Yeni grup başarıyla oluşturuldu!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Grup oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      toast({
        title: "Hata",
        description: "Grup adı gerekli",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser.isAdmin) {
      toast({
        title: "Hata",
        description: "Sadece yöneticiler grup oluşturabilir",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    createGroupMutation.mutate({
      name: groupName.trim(),
      description: groupDescription.trim() || undefined,
    });
    setIsLoading(false);
  };

  const handleClose = () => {
    setGroupName("");
    setGroupDescription("");
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-[var(--discord-dark)] border-[var(--discord-darker)] text-[var(--discord-light)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--discord-light)]">Yeni Grup Oluştur</DialogTitle>
          <DialogDescription className="text-[var(--discord-light)]/70">
            Yeni bir sohbet grubu oluşturun. Sadece yöneticiler grup oluşturabilir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name" className="text-[var(--discord-light)]">
              Grup Adı *
            </Label>
            <Input
              id="group-name"
              data-testid="input-group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Grup adını girin"
              maxLength={50}
              className="bg-[var(--discord-darker)] border-[var(--discord-light)]/20 text-[var(--discord-light)] placeholder:text-[var(--discord-light)]/50 focus:border-[var(--discord-blurple)]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description" className="text-[var(--discord-light)]">
              Açıklama
            </Label>
            <Textarea
              id="group-description"
              data-testid="textarea-group-description"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Grup açıklamasını girin (isteğe bağlı)"
              maxLength={200}
              rows={3}
              className="bg-[var(--discord-darker)] border-[var(--discord-light)]/20 text-[var(--discord-light)] placeholder:text-[var(--discord-light)]/50 focus:border-[var(--discord-blurple)] resize-none"
            />
            <div className="text-xs text-[var(--discord-light)]/50 text-right">
              {groupDescription.length}/200
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="bg-transparent border-[var(--discord-light)]/20 text-[var(--discord-light)] hover:bg-[var(--discord-light)]/10"
              data-testid="button-cancel-group"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !groupName.trim() || !currentUser.isAdmin}
              className="bg-[var(--discord-blurple)] hover:bg-[var(--discord-blurple)]/80 text-white"
              data-testid="button-create-group"
            >
              {isLoading ? "Oluşturuluyor..." : "Grup Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}