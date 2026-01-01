import { useState } from "react";
import { Hash, Settings, User, LogOut, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Room, User as UserType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RoomSidebarProps {
  rooms: any[];
  currentRoom: any;
  currentUser: any;
  onRoomChange: (room: any) => void;
  onLogout: () => void;
  onEditProfile: (user: any) => void;
}

export default function RoomSidebar({ 
  rooms = [], 
  currentRoom, 
  currentUser, 
  onRoomChange,
  onLogout,
  onEditProfile
}: RoomSidebarProps) {
  const [showDMs, setShowDMs] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dmRooms } = useQuery<any[]>({
    queryKey: ["/api/dm", currentUser.id],
    enabled: !!currentUser,
  });

  const { data: allUsersForDM } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: !!currentUser,
  });

  const createRoomMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/rooms", { 
        name, 
        description: `${name} kanalı`,
        isDM: false,
        participants: null
      });
      return res.json();
    },
    onSuccess: (newRoom) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ title: "Başarılı", description: "Kanal oluşturuldu" });
      onRoomChange(newRoom);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message || "Kanal oluşturulamadı", variant: "destructive" });
    }
  });

  const handleCreateRoom = () => {
    const name = prompt("Kanal adı girin (örn: #sohbet):");
    if (name && name.trim()) {
      createRoomMutation.mutate(name.trim());
    }
  };

  const getDMDisplayName = (room: any) => {
    if (!room.participants || room.participants.length < 2) return room.name;
    const otherUserName = room.name.split(', ').find((name: string) => name !== currentUser.username);
    return otherUserName || "DM";
  };

  const getDMUserInfo = (room: any) => {
    if (!room.participants || !allUsersForDM) return null;
    const otherUserId = room.participants.find((id: string) => id !== currentUser.id);
    if (!otherUserId) return null;
    return allUsersForDM.find((user: any) => user.id === otherUserId);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22]/95 backdrop-blur-xl border-r border-white/5 font-sans">
      <div className="p-4 border-b border-white/5 bg-[#2b2d31]/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
              <img src="https://i.imgur.com/DvliwXN.png" alt="Nexus" className="h-6 w-auto" />
            </div>
            <div>
              <h2 className="font-black text-white tracking-tight leading-none text-sm uppercase">CHAT</h2>
              <h2 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-400 tracking-tight leading-none mt-0.5 text-sm uppercase">NEXUS</h2>
            </div>
          </div>
          {currentUser?.isAdmin && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" onClick={handleCreateRoom}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          <section>
            <h3 className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Kanallar</h3>
            <div className="space-y-0.5">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => onRoomChange(room)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 group ${
                    currentRoom?.id === room.id
                      ? "bg-slate-800 text-white shadow-md"
                      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                  }`}
                >
                  <Hash className={`h-4 w-4 ${currentRoom?.id === room.id ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                  <span className="font-semibold text-sm truncate">{room.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <button
              onClick={() => setShowDMs(!showDMs)}
              className="w-full flex items-center justify-between px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-slate-300 transition-colors"
            >
              <span>Özel Mesajlar</span>
              {showDMs ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {showDMs && (
              <div className="space-y-0.5">
                {dmRooms?.map((room) => {
                  const isActive = currentRoom?.id === room.id;
                  const otherUser = getDMUserInfo(room);
                  return (
                    <button
                      key={room.id}
                      onClick={() => onRoomChange(room)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 group ${
                        isActive ? "bg-slate-800 text-white shadow-md" : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                      }`}
                    >
                      <Avatar className="h-5 w-5 border border-white/5">
                        <AvatarImage src={otherUser?.profileImage || ""} className="object-cover" />
                        <AvatarFallback className="bg-slate-700 text-[10px] font-bold">
                          {getDMDisplayName(room).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-sm truncate">{getDMDisplayName(room)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>

      <div className="p-4 bg-[#232428]/80 border-t border-white/5">
        <div className="flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-8 w-8 border border-white/10 shadow-lg">
              <AvatarImage src={currentUser?.profileImage || ""} className="object-cover" />
              <AvatarFallback className="bg-slate-800 text-[10px] font-bold text-slate-400">
                {(currentUser?.displayName || currentUser?.username || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate leading-tight">
                {currentUser?.displayName || currentUser?.username}
              </span>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Çevrimiçi</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-white/10 text-slate-400">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="bg-[#1e1f22] border-white/5">
                <DropdownMenuItem onClick={() => onEditProfile(currentUser)} className="text-slate-200 focus:bg-slate-800">
                  <User className="h-4 w-4 mr-2" /> Profili Düzenle
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout} className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-400">
                  <LogOut className="h-4 w-4 mr-2" /> Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
