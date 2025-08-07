import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { X, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { User, Room } from "@shared/schema";

interface PollCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  currentRoom: Room;
}

export default function PollCreationModal({ isOpen, onClose, currentUser, currentRoom }: PollCreationModalProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPollMutation = useMutation({
    mutationFn: async (pollData: {
      roomId: string;
      userId: string;
      messageType: string;
      pollQuestion: string;
      pollOptions: string[];
      pollVotes: string;
    }) => {
      const response = await apiRequest("POST", "/api/messages", pollData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", currentRoom.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Başarılı",
        description: "Oylama oluşturuldu",
      });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Oylama oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast({
        title: "Hata",
        description: "Oylama sorusu gerekli",
        variant: "destructive",
      });
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      toast({
        title: "Hata",
        description: "En az 2 seçenek gerekli",
        variant: "destructive",
      });
      return;
    }

    createPollMutation.mutate({
      roomId: currentRoom.id,
      userId: currentUser.id,
      messageType: "poll",
      pollQuestion: question.trim(),
      pollOptions: validOptions,
      pollVotes: JSON.stringify([]),
    });
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-[var(--discord-dark)] border-[var(--discord-darker)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--discord-light)]">Oylama Oluştur</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="question" className="text-[var(--discord-light)]">
              Oylama Sorusu
            </Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Oylamak istediğiniz soruyu yazın..."
              className="bg-[var(--discord-darker)] border-[var(--discord-darker)] text-[var(--discord-light)] placeholder:text-[var(--discord-light)]/50"
              maxLength={200}
            />
          </div>

          <div>
            <Label className="text-[var(--discord-light)]">Seçenekler</Label>
            <div className="space-y-2 mt-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Seçenek ${index + 1}`}
                    className="bg-[var(--discord-darker)] border-[var(--discord-darker)] text-[var(--discord-light)] placeholder:text-[var(--discord-light)]/50"
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            {options.length < 10 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addOption}
                className="mt-2 text-[var(--discord-blurple)] hover:text-[var(--discord-blurple)] hover:bg-[var(--discord-blurple)]/10"
              >
                <Plus className="w-4 h-4 mr-1" />
                Seçenek Ekle
              </Button>
            )}
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
              disabled={createPollMutation.isPending}
              className="bg-[var(--discord-blurple)] hover:bg-[var(--discord-blurple)]/90 text-white"
            >
              {createPollMutation.isPending ? "Oluşturuluyor..." : "Oylama Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}