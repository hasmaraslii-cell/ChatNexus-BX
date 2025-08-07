import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { MessageWithUser, User, ReactionWithUser } from "@shared/schema";

interface EmojiReactionsProps {
  message: MessageWithUser;
  currentUser?: User;
}

const commonEmojis = ["👍", "👎", "❤️", "😂", "😮", "😢", "🔥", "👏", "💯", "🎉"];

export default function EmojiReactions({ message, currentUser }: EmojiReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reactionMutation = useMutation({
    mutationFn: async ({ emoji, action }: { emoji: string; action: 'add' | 'remove' }) => {
      const response = await apiRequest("POST", `/api/messages/${message.id}/reactions`, {
        userId: currentUser?.id,
        emoji,
        action,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/rooms/${message.roomId}/messages`] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Tepki eklenemedi",
        variant: "destructive",
      });
    },
  });

  const reactions = message.reactions || [];
  
  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        userReacted: false,
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.user);
    if (reaction.userId === currentUser?.id) {
      acc[reaction.emoji].userReacted = true;
    }
    return acc;
  }, {} as Record<string, { emoji: string; count: number; users: User[]; userReacted: boolean }>);

  const handleReaction = (emoji: string) => {
    if (!currentUser) {
      toast({
        title: "Hata",
        description: "Tepki vermek için giriş yapmanız gerekiyor",
        variant: "destructive",
      });
      return;
    }

    const existing = groupedReactions[emoji];
    const action = existing?.userReacted ? 'remove' : 'add';
    
    reactionMutation.mutate({ emoji, action });
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {/* Existing reactions */}
      {Object.values(groupedReactions).map(({ emoji, count, users, userReacted }) => (
        <Button
          key={emoji}
          variant="ghost"
          size="sm"
          onClick={() => handleReaction(emoji)}
          className={`h-6 px-2 text-xs ${
            userReacted
              ? "bg-[var(--discord-blurple)]/20 border border-[var(--discord-blurple)]/50 text-[var(--discord-blurple)]"
              : "bg-[var(--discord-darker)] hover:bg-[var(--discord-dark)] text-[var(--discord-light)]/70"
          }`}
          title={users.map(u => u.username).join(", ")}
        >
          <span className="mr-1">{emoji}</span>
          <span>{count}</span>
        </Button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="h-6 w-6 p-0 text-[var(--discord-light)]/50 hover:text-[var(--discord-light)] hover:bg-[var(--discord-darker)]"
          title="Tepki ekle"
        >
          <Plus className="w-3 h-3" />
        </Button>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-full left-0 mb-1 bg-[var(--discord-dark)] border border-[var(--discord-darker)] rounded-lg p-2 shadow-lg z-50">
            <div className="grid grid-cols-5 gap-1">
              {commonEmojis.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction(emoji)}
                  className="h-8 w-8 p-0 text-lg hover:bg-[var(--discord-darker)]"
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}