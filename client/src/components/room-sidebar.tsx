import { Hash, Plus, Settings, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminPanel from "@/components/admin-panel";
import type { Room, User as UserType } from "@shared/schema";

interface RoomSidebarProps {
  rooms: Room[];
  currentRoom: Room;
  currentUser: UserType;
  onRoomChange: (room: Room) => void;
  onLogout?: () => void;
}

export default function RoomSidebar({ 
  rooms, 
  currentRoom, 
  currentUser, 
  onRoomChange,
  onLogout
}: RoomSidebarProps) {
  const getMessageCount = (room: Room) => {
    // Use real message count from room data
    return room.messageCount || 0;
  };

  const getCountColor = (count: number) => {
    if (count === 0) return "hidden";
    if (count < 10) return "bg-red-500 text-white";
    return "bg-[var(--discord-blurple)] text-white";
  };

  return (
    <div className="w-72 bg-[var(--discord-darker)] flex flex-col border-r border-[var(--discord-dark)]">
      <div className="p-4 border-b border-[var(--discord-dark)]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--discord-blurple)]">IBX</h2>
          {currentUser.isAdmin && (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-[var(--discord-yellow)]">👑</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-dark)]"
                title="Yönetici - Yeni Kanal Ekle"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <h3 className="text-xs uppercase text-[var(--discord-light)]/50 font-semibold mb-2 px-2">
            Odalar
          </h3>
          
          {rooms.map((room) => {
            const messageCount = getMessageCount(room);
            const isActive = currentRoom.id === room.id;
            
            return (
              <div key={room.id} className="mb-1">
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-2 py-2 h-auto hover:bg-[var(--discord-dark)]/80 transition-all duration-200 group rounded-md ${
                    isActive 
                      ? "bg-[var(--discord-dark)] text-[var(--discord-light)] border-l-2 border-[var(--discord-blurple)]" 
                      : "text-[var(--discord-light)]/70 hover:text-[var(--discord-light)]"
                  }`}
                  onClick={() => onRoomChange(room)}
                >
                  <Hash className={`text-sm mr-2 w-4 h-4 transition-colors ${
                    isActive ? "text-[var(--discord-light)]" : "text-[var(--discord-light)]/50 group-hover:text-[var(--discord-light)]/70"
                  }`} />
                  <span className="flex-1 text-left font-medium">
                    {room.name}
                  </span>
                  {messageCount > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold transition-all ${getCountColor(messageCount)}`}>
                      {messageCount}
                    </span>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Admin Panel */}
      <AdminPanel currentUser={currentUser} rooms={rooms} />
      
      {/* User Info */}
      <div className="p-3 border-t border-[var(--discord-dark)]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[var(--discord-blurple)] rounded-full flex items-center justify-center overflow-hidden">
            {currentUser.profileImage ? (
              <img 
                src={currentUser.profileImage} 
                alt={currentUser.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="text-white text-sm w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-[var(--discord-light)]">
              {currentUser.username}
              {currentUser.isAdmin && (
                <span className="ml-2 text-xs text-[var(--discord-yellow)]">👑</span>
              )}
            </p>
            <p className="text-xs text-[var(--discord-light)]/50">Çevrimiçi</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-dark)] p-1"
                title="Kullanıcı Menüsü"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="bg-[var(--discord-darker)] border-[var(--discord-dark)]"
              side="top"
              align="end"
            >
              <DropdownMenuItem 
                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
