import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, UserCog } from "lucide-react";
import type { User } from "@shared/schema";

interface UserListSidebarProps {
  onlineUsers: User[];
  offlineUsers: User[];
  currentUserId?: string;
  onEditProfile?: (user: User) => void;
  onStartDM?: (user: User) => void;
}

export default function UserListSidebar({ 
  onlineUsers = [], 
  offlineUsers = [], 
  currentUserId, 
  onEditProfile, 
  onStartDM
}: UserListSidebarProps) {
  const [showOnline, setShowOnline] = useState(true);
  const [showOffline, setShowOffline] = useState(true);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "busy": return "bg-red-500";
      default: return "bg-slate-500";
    }
  };

  const getStatusText = (user: User) => {
    if (user.status === "online") return "Çevrimiçi";
    if (user.lastSeen) {
      const time = new Date(user.lastSeen).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
      return `Son Görülme: ${time}`;
    }
    return "Çevrimdışı";
  };

  const getUserColor = (userId: string) => {
    const colors = ["bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-emerald-500"];
    return colors[userId.length % colors.length];
  };

  const UserItem = ({ user }: { user: User }) => (
    <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 group transition-colors">
      <div className="relative">
        <Avatar className="h-8 w-8 border border-white/10 shadow-sm">
          <AvatarImage src={user.profileImage || ""} className="object-cover" />
          <AvatarFallback className={`text-white text-xs font-bold ${getUserColor(user.id)}`}>
            {(user.displayName || user.username).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1e1f22] ${getStatusColor(user.status || "offline")}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <button
          onClick={() => onStartDM?.(user)}
          className="text-sm font-bold text-slate-200 truncate hover:text-blue-400 hover:underline cursor-pointer bg-transparent border-none p-0 text-left transition-colors w-full"
        >
          {user.displayName || user.username}
        </button>
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{getStatusText(user)}</p>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        {onEditProfile && user.id === currentUserId && (
          <Button variant="ghost" size="icon" onClick={() => onEditProfile(user)} className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-white/10">
            <UserCog className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-60 bg-[#1e1f22]/95 backdrop-blur-xl border-l border-white/5 flex flex-col h-full font-sans text-slate-200">
      <div className="p-4 border-b border-white/5 bg-[#2b2d31]/50">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ÜYELER</h3>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-6">
          <div>
            <button onClick={() => setShowOnline(!showOnline)} className="w-full flex items-center gap-1.5 px-1 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors mb-2">
              {showOnline ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span>Çevrimiçi — {onlineUsers.length}</span>
            </button>
            {showOnline && <div className="space-y-0.5">{onlineUsers.map(user => <UserItem key={user.id} user={user} />)}</div>}
          </div>
          <div>
            <button onClick={() => setShowOffline(!showOffline)} className="w-full flex items-center gap-1.5 px-1 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors mb-2">
              {showOffline ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span>Çevrimdışı — {offlineUsers.length}</span>
            </button>
            {showOffline && <div className="space-y-0.5">{offlineUsers.map(user => <UserItem key={user.id} user={user} />)}</div>}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
