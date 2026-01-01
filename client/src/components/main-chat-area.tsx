import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Hash, Plus, Send, X, Reply } from "lucide-react";
import MessageItem from "@/components/message-item";
import { useNotifications } from "@/hooks/use-notifications";
import type { Room, User, MessageWithUser } from "@shared/schema";

interface MainChatAreaProps {
  currentRoom: Room;
  currentUser: User;
  replyToMessage?: MessageWithUser | null;
  onClearReply?: () => void;
  onReply?: (message: MessageWithUser) => void;
  onStartDM?: (user: User) => void;
}

export default function MainChatArea({ currentRoom, currentUser, replyToMessage, onClearReply, onReply, onStartDM }: MainChatAreaProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { sendMessageNotification } = useNotifications(currentUser);

  const { data: messages } = useQuery({
    queryKey: ["/api/rooms", currentRoom.id, "messages"],
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest("POST", "/api/messages", messageData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", currentRoom.id, "messages"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim()) return;

    sendMessageMutation.mutate({
      roomId: currentRoom.id,
      userId: currentUser.id,
      content: message.trim(),
      messageType: "text",
      replyToId: replyToMessage?.id
    });

    setMessage("");
    onClearReply?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#c6dfff]/10 to-[#f7c6e9]/10 relative">
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#1e1f22]/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg">
            <Hash className="h-5 w-5 text-blue-400" />
          </div>
          <h1 className="font-black text-white text-lg tracking-tight uppercase">{currentRoom.name}</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages?.map((msg: MessageWithUser) => (
          <MessageItem 
            key={msg.id} 
            message={msg} 
            currentUser={currentUser}
            onReply={onReply}
            onStartDM={onStartDM}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 bg-transparent">
        <div className="max-w-4xl mx-auto relative">
          {replyToMessage && (
            <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-[#2b2d31]/90 backdrop-blur-xl border border-white/10 rounded-t-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <Reply className="h-4 w-4 text-blue-400 shrink-0" />
                <div className="text-xs truncate">
                  <span className="font-bold text-white">@{replyToMessage.user.displayName || replyToMessage.user.username}</span>
                  <span className="text-slate-400 ml-2">{replyToMessage.content}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={onClearReply}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          <div className={`flex items-center gap-2 p-2 bg-[#1e1f22]/60 backdrop-blur-2xl border border-white/10 shadow-2xl ${replyToMessage ? 'rounded-b-2xl' : 'rounded-2xl'}`}>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white hover:bg-white/5">
              <Plus className="h-5 w-5" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`${currentRoom.name} kanalına mesaj gönder...`}
              className="flex-1 bg-transparent border-none focus-visible:ring-0 resize-none min-h-[40px] max-h-[200px] text-white py-2"
            />
            <Button 
              onClick={() => handleSubmit()} 
              disabled={!message.trim()} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 h-10 w-10 p-0 rounded-xl shadow-lg shadow-blue-500/20"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
