import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Reply, Trash2, MoreHorizontal, User, ShieldCheck, ShieldAlert, Star } from "lucide-react";
import type { MessageWithUser, User as UserType } from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";

interface MessageItemProps {
  message: MessageWithUser;
  currentUser?: UserType;
  onReply?: (message: MessageWithUser) => void;
  onStartDM?: (user: UserType) => void;
}

export default function MessageItem({ message, currentUser, onReply, onStartDM }: MessageItemProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMessageMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/messages/${message.id}`, { userId: currentUser?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", message.roomId, "messages"] });
      toast({ title: "Başarılı", description: "Mesaj silindi" });
    }
  });

  const promoteAdminMutation = useMutation({
    mutationFn: async (level: number) => {
      await apiRequest("POST", `/api/users/${message.user.id}/admin`, { level, adminId: currentUser?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/online"] });
      toast({ title: "Başarılı", description: "Yönetici yetkileri güncellendi" });
    }
  });

  const banUserMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${message.user.id}/ban`, { adminId: currentUser?.id });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Kullanıcı banlandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/users/online"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/offline"] });
    }
  });

  const isAuthor = currentUser?.id === message.userId;
  const isSuperAdmin = currentUser?.adminLevel === 2;
  const isAltAdmin = currentUser?.adminLevel === 1;
  const canDelete = isAuthor || isSuperAdmin || (isAltAdmin && message.user.adminLevel === 0);

  return (
    <div className="group flex flex-col space-y-1 hover:bg-white/10 px-4 py-2 -mx-4 rounded-xl transition-all relative">
      {message.replyTo && (
        <div className="flex items-center gap-2 mb-1 ml-10 opacity-60 scale-90 origin-left bg-white/5 p-1 rounded-md border-l-2 border-blue-400">
          <Avatar className="h-4 w-4">
            <AvatarImage src={message.replyTo.user.profileImage || ""} />
            <AvatarFallback>{message.replyTo.user.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-bold text-slate-200 truncate max-w-[400px]">
            {message.replyTo.content}
          </span>
        </div>
      )}

      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10 border border-white/10 shadow-xl cursor-pointer" onClick={() => onStartDM?.(message.user)}>
          <AvatarImage src={message.user.profileImage || ""} className="object-cover" />
          <AvatarFallback className="bg-slate-800 font-bold text-white">
            {message.user.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-black text-white text-sm hover:underline cursor-pointer" onClick={() => onStartDM?.(message.user)}>
              {message.user.displayName || message.user.username}
            </span>
            {message.user.adminLevel === 2 && (
              <span className="bg-blue-500/20 text-blue-400 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-blue-500/30 flex items-center gap-1">
                <ShieldCheck className="h-2 w-2" /> ANA ADMIN
              </span>
            )}
            {message.user.adminLevel === 1 && (
              <span className="bg-purple-500/20 text-purple-400 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-purple-500/30 flex items-center gap-1">
                <ShieldAlert className="h-2 w-2" /> MODERATÖR
              </span>
            )}
            <span className="text-[10px] text-white/40 font-bold">
              {new Date(message.createdAt!).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-white/90 text-sm leading-relaxed break-words">{message.content}</p>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-4 flex gap-1 z-20">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white bg-white/10 backdrop-blur-md" onClick={() => onReply?.(message)}>
            <Reply className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white bg-white/10 backdrop-blur-md">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-white/20 shadow-2xl z-[100] min-w-[160px]">
              <DropdownMenuItem className="text-slate-900 font-bold hover:bg-slate-100 cursor-pointer" onClick={() => onReply?.(message)}>
                <Reply className="h-4 w-4 mr-2" /> Yanıtla
              </DropdownMenuItem>
              <DropdownMenuItem className="text-slate-900 font-bold hover:bg-slate-100 cursor-pointer" onClick={() => onStartDM?.(message.user)}>
                <User className="h-4 w-4 mr-2" /> DM Gönder
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem className="text-rose-600 font-bold hover:bg-rose-50 cursor-pointer" onClick={() => deleteMessageMutation.mutate()}>
                  <Trash2 className="h-4 w-4 mr-2" /> Sil
                </DropdownMenuItem>
              )}
              {isSuperAdmin && !isAuthor && (
                <>
                  <DropdownMenuItem className="text-blue-600 font-bold hover:bg-blue-50 cursor-pointer" onClick={() => promoteAdminMutation.mutate(message.user.adminLevel === 1 ? 0 : 1)}>
                    <Star className="h-4 w-4 mr-2" /> {message.user.adminLevel === 1 ? 'Yetki Al' : 'Mod Yap'}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-700 font-bold hover:bg-red-50 cursor-pointer" onClick={() => banUserMutation.mutate()}>
                    <Trash2 className="h-4 w-4 mr-2" /> Banla
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
