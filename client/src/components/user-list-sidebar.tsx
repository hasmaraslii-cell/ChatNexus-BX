import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, UserCog, Ban, Shield } from "lucide-react";
import type { User } from "@shared/schema";

interface UserListSidebarProps {
  users: User[];
  currentUserId?: string;
  onEditProfile?: (user: User) => void;
  onBanUser?: (user: User) => void;
}

export default function UserListSidebar({ users, currentUserId, onEditProfile, onBanUser }: UserListSidebarProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "status-online";
      case "away":
        return "status-away";
      case "busy":
        return "status-busy";
      default:
        return "status-offline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "Çevrimiçi";
      case "away":
        return "Uzakta";
      case "busy":
        return "Meşgul";
      default:
        return "Çevrimdışı";
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

  const [showOffline, setShowOffline] = useState(false);
  const [showOnline, setShowOnline] = useState(true);

  const { data: offlineUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/offline"],
    refetchInterval: 10000,
  });

  const currentUser = users.find((u: User) => u.id === currentUserId) || offlineUsers.find((u: User) => u.id === currentUserId);
  const onlineUsers = users.filter((u: User) => u.status === "online");
  const filteredOfflineUsers = offlineUsers.filter((u: User) => u.status !== "online");

  const handleUserAction = (user: User, action: "edit" | "ban") => {
    if (action === "edit" && onEditProfile) {
      onEditProfile(user);
    } else if (action === "ban" && onBanUser && currentUser?.isAdmin) {
      onBanUser(user);
    }
  };

  const renderUserItem = (user: User, isOffline = false) => (
    <div
      key={user.id}
      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[var(--discord-dark)] transition-colors group"
    >
      <div className="relative">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${getUserColor(user.id)}`}>
          {user.profileImage ? (
            <img 
              src={user.profileImage} 
              alt={user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-sm font-semibold">
              {user.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[var(--discord-darker)] ${getStatusColor(user.status)}`}></div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium text-[var(--discord-light)] truncate">
            {user.username}
          </p>
          {user.isAdmin && (
            <Badge variant="secondary" className="text-xs px-1 py-0">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
        </div>
        <p className="text-xs text-[var(--discord-light)]/50">
          {getStatusText(user.status)}
        </p>
      </div>
      
      {/* User Actions */}
      <div className="opacity-0 group-hover:opacity-100 flex space-x-1 transition-opacity">
        {(user.id === currentUserId || currentUser?.isAdmin) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--discord-light)]/50 hover:text-[var(--discord-light)] p-1"
            title="Profili Düzenle"
            onClick={() => handleUserAction(user, "edit")}
          >
            <UserCog className="w-4 h-4" />
          </Button>
        )}
        {currentUser?.isAdmin && user.id !== currentUserId && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--discord-light)]/50 hover:text-red-400 p-1"
            title="Kullanıcıyı Banla"
            onClick={() => handleUserAction(user, "ban")}
          >
            <Ban className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-60 bg-[var(--discord-darker)] border-l border-[var(--discord-dark)] flex flex-col">
      {/* Online Users Section */}
      <div className="border-b border-[var(--discord-dark)]">
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto rounded-none hover:bg-[var(--discord-dark)]"
          onClick={() => setShowOnline(!showOnline)}
        >
          <div className="text-left">
            <h3 className="font-semibold text-[var(--discord-light)]">
              Çevrimiçi
            </h3>
            <p className="text-xs text-[var(--discord-light)]/50">
              {onlineUsers.length} kişi aktif
            </p>
          </div>
          {showOnline ? (
            <ChevronDown className="w-4 h-4 text-[var(--discord-light)]/50" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--discord-light)]/50" />
          )}
        </Button>
        
        {showOnline && (
          <div className="p-2 space-y-1">
            {onlineUsers.map((user) => renderUserItem(user))}
            
            {onlineUsers.length === 0 && (
              <div className="text-center p-4">
                <p className="text-[var(--discord-light)]/50 text-sm">
                  Çevrimiçi kullanıcı yok
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Offline Users Section */}
      <div className="border-b border-[var(--discord-dark)]">
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto rounded-none hover:bg-[var(--discord-dark)]"
          onClick={() => setShowOffline(!showOffline)}
        >
          <div className="text-left">
            <h3 className="font-semibold text-[var(--discord-light)]">
              Çevrimdışı
            </h3>
            <p className="text-xs text-[var(--discord-light)]/50">
              {filteredOfflineUsers.length} kişi
            </p>
          </div>
          {showOffline ? (
            <ChevronDown className="w-4 h-4 text-[var(--discord-light)]/50" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--discord-light)]/50" />
          )}
        </Button>
        
        {showOffline && (
          <div className="p-2 space-y-1">
            {filteredOfflineUsers.map((user: User) => renderUserItem(user, true))}
            
            {filteredOfflineUsers.length === 0 && (
              <div className="text-center p-4">
                <p className="text-[var(--discord-light)]/50 text-sm">
                  Çevrimdışı kullanıcı yok
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
