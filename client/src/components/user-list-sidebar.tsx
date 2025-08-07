import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, UserCog, Ban, Shield } from "lucide-react";

import type { User } from "@shared/schema";

interface UserListSidebarProps {
  onlineUsers: User[];
  offlineUsers: User[];
  currentUserId?: string;
  onEditProfile?: (user: User) => void;
  onBanUser?: (user: User) => void;
  onStartDM?: (user: User) => void;

}

export default function UserListSidebar({ 
  onlineUsers = [], 
  offlineUsers = [], 
  currentUserId, 
  onEditProfile, 
  onBanUser,
  onStartDM
}: UserListSidebarProps) {
  const [showOnline, setShowOnline] = useState(true);
  const [showOffline, setShowOffline] = useState(true);

  const allUsers = [...onlineUsers, ...offlineUsers];
  const currentUser = allUsers.find((user: User) => user.id === currentUserId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "busy":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (user: User) => {
    if (user.status === "online") {
      return "Çevrimiçi";
    } else {
      // Show "En Son Aktifti: HH:MM" format for offline users
      if (user.lastSeen) {
        const lastSeenDate = new Date(user.lastSeen);
        const time = lastSeenDate.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `En Son Aktifti: ${time}`;
      }
      return "En Son Aktifti: Bilinmiyor";
    }
  };

  const getUserColor = (userId: string) => {
    const colors = [
      "bg-green-500",
      "bg-blue-500", 
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-indigo-500",
    ];
    return colors[userId.length % colors.length];
  };

  const handleUserAction = (user: User, action: "edit" | "ban") => {
    if (action === "edit" && onEditProfile) {
      onEditProfile(user);
    } else if (action === "ban" && onBanUser && currentUser?.isAdmin) {
      onBanUser(user);
    }
  };

  const UserItem = ({ user }: { user: User }) => (
    <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[var(--discord-darker)] group">
      <div className="relative">
        {user.profileImage ? (
          <img
            src={user.profileImage}
            alt={user.username}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className={`w-8 h-8 rounded-full ${getUserColor(user.id)} flex items-center justify-center text-white text-sm font-medium`}>
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div
          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[var(--discord-dark)] ${getStatusColor(user.status || "offline")}`}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onStartDM?.(user)}
            className="text-sm font-medium text-[var(--discord-light)] truncate hover:text-[var(--discord-blurple)] hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
          >
            {user.username}
          </button>
          {user.isAdmin && (
            <Shield className="w-4 h-4 text-yellow-500" />
          )}
        </div>
        <p className="text-xs text-[var(--discord-light)]/70">
          {getStatusText(user)}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
        {onEditProfile && user.id === currentUserId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUserAction(user, "edit")}
            className="h-6 w-6 p-0 text-[var(--discord-light)]/70 hover:text-[var(--discord-light)]"
            title="Profili Düzenle"
          >
            <UserCog className="w-3 h-3" />
          </Button>
        )}
        

        
        {onBanUser && currentUser?.isAdmin && user.id !== currentUserId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUserAction(user, "ban")}
            className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
            title="Kullanıcıyı Yasakla"
          >
            <Ban className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-64 bg-[var(--discord-darker)] border-l border-[var(--discord-dark)] flex flex-col">
      <div className="p-4 border-b border-[var(--discord-dark)]">
        <h3 className="text-lg font-semibold text-[var(--discord-light)]">
          Kullanıcılar
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto mobile-scroll-area p-3 space-y-4">
        {/* Online Users Section */}
        <div>
          <Button
            variant="ghost"
            onClick={() => setShowOnline(!showOnline)}
            className="w-full justify-start p-1 h-auto text-xs text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] mb-2"
          >
            {showOnline ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span className="ml-2 uppercase font-semibold">
              Kullanıcılar — {onlineUsers.length + offlineUsers.length}
            </span>
          </Button>
          
          {showOnline && (
            <div className="space-y-1">
              {onlineUsers.map((user) => (
                <UserItem key={user.id} user={user} />
              ))}
              {offlineUsers.map((user) => (
                <UserItem key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>

        {/* Hide offline users section - as requested */}
      </div>
    </div>
  );
}