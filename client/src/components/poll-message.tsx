import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { MessageWithUser, User, PollVote } from "@shared/schema";

interface PollMessageProps {
  message: MessageWithUser;
  currentUser?: User;
}

export default function PollMessage({ message, currentUser }: PollMessageProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const votes: PollVote[] = message.pollVotes ? JSON.parse(message.pollVotes) : [];
  const totalVotes = votes.length;
  const userVote = votes.find(vote => vote.userId === currentUser?.id);

  const voteMutation = useMutation({
    mutationFn: async (optionIndex: number) => {
      const response = await apiRequest("POST", `/api/messages/${message.id}/vote`, {
        userId: currentUser?.id,
        optionIndex,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/rooms/${message.roomId}/messages`] });
      toast({
        title: "Başarılı",
        description: "Oyunuz kaydedildi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Oy verilemedi",
        variant: "destructive",
      });
    },
  });

  const getVoteCount = (optionIndex: number) => {
    return votes.filter(vote => vote.optionIndex === optionIndex).length;
  };

  const getVotePercentage = (optionIndex: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((getVoteCount(optionIndex) / totalVotes) * 100);
  };

  const handleVote = (optionIndex: number) => {
    if (!currentUser) {
      toast({
        title: "Hata",
        description: "Oy vermek için giriş yapmanız gerekiyor",
        variant: "destructive",
      });
      return;
    }

    if (userVote) {
      toast({
        title: "Bilgi",
        description: "Zaten oy verdiniz",
        variant: "destructive",
      });
      return;
    }

    setSelectedOption(optionIndex);
    voteMutation.mutate(optionIndex);
  };

  if (!message.pollQuestion || !message.pollOptions) {
    return null;
  }

  return (
    <div className="bg-[var(--discord-darker)] rounded-lg p-4 mt-2 border border-[var(--discord-darker)]">
      <h4 className="text-[var(--discord-light)] font-medium mb-3">
        📊 {message.pollQuestion}
      </h4>
      
      <div className="space-y-2">
        {message.pollOptions.map((option, index) => {
          const voteCount = getVoteCount(index);
          const percentage = getVotePercentage(index);
          const isUserVote = userVote?.optionIndex === index;
          const isSelected = selectedOption === index;

          return (
            <div key={index} className="relative">
              <Button
                variant="ghost"
                onClick={() => handleVote(index)}
                disabled={!!userVote || voteMutation.isPending}
                className={`w-full text-left justify-start p-3 h-auto relative overflow-hidden ${
                  isUserVote 
                    ? "bg-[var(--discord-blurple)]/20 border border-[var(--discord-blurple)]/50" 
                    : "bg-[var(--discord-dark)] hover:bg-[var(--discord-dark)]/80"
                } ${isSelected ? "opacity-50" : ""}`}
              >
                {/* Progress bar background */}
                {totalVotes > 0 && (
                  <div 
                    className={`absolute inset-0 ${
                      isUserVote ? "bg-[var(--discord-blurple)]/30" : "bg-[var(--discord-light)]/10"
                    } transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                )}
                
                <div className="relative flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    {isUserVote && <Check className="w-4 h-4 text-[var(--discord-blurple)]" />}
                    <span className="text-[var(--discord-light)]">{option}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-[var(--discord-light)]/70">
                    <span>{voteCount} oy</span>
                    {totalVotes > 0 && <span>({percentage}%)</span>}
                  </div>
                </div>
              </Button>
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 text-sm text-[var(--discord-light)]/70">
        Toplam oy: {totalVotes}
        {userVote && <span className="ml-2">• Oy verdiniz</span>}
      </div>
    </div>
  );
}