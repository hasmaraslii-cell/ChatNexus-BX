import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User } from "@shared/schema";
import { ShieldCheck, User as UserIcon } from "lucide-react";

interface UserListProps {
  onStartDM: (user: User) => void;
}

export default function UserList({ onStartDM }: UserListProps) {
  const { data: onlineUsers } = useQuery<User[]>({
    queryKey: ["/api/users/online"],
    refetchInterval: 5000,
  });

  const { data: offlineUsers } = useQuery<User[]>({
    queryKey: ["/api/users/offline"],
    refetchInterval: 30000,
  });

  const renderUser = (user: User, isOnline: boolean) => (
    <div
      key={user.id}
      onClick={() => onStartDM(user)}
      className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer transition-all duration-200"
    >
      <div className="relative">
        <Avatar className="h-8 w-8 border border-white/10 shadow-md">
          <AvatarImage src={user.profileImage || ""} className="object-cover" />
          <AvatarFallback className="bg-slate-800 text-xs font-bold text-slate-400">
            {user.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-[#1e1f22] rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold truncate ${isOnline ? 'text-slate-100' : 'text-slate-500'}`}>
            {user.displayName || user.username}
          </span>
          {user.isAdmin && (
            <ShieldCheck className="h-3 w-3 text-blue-400" />
          )}
        </div>
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          {user.status === 'online' ? 'Çevrimiçi' : (user.status === 'away' ? 'Uzakta' : 'Çevrimdışı')}
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-transparent border-l border-white/5 font-sans">
      <div className="p-4 border-b border-white/5 bg-[#2b2d31]/50">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-slate-400" />
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kullanıcılar</h3>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          <section>
            <h4 className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Çevrimiçi — {onlineUsers?.length || 0}</h4>
            <div className="space-y-0.5">
              {onlineUsers?.map(user => renderUser(user, true))}
            </div>
          </section>

          <section>
            <h4 className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Çevrimdışı — {offlineUsers?.length || 0}</h4>
            <div className="space-y-0.5">
              {offlineUsers?.map(user => renderUser(user, false))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
