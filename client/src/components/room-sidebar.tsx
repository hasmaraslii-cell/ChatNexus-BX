import { Hash, Plus, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Room, User as UserType } from "@shared/schema";

interface RoomSidebarProps {
  rooms: Room[];
  currentRoom: Room;
  currentUser: UserType;
  onRoomChange: (room: Room) => void;
}

export default function RoomSidebar({ 
  rooms, 
  currentRoom, 
  currentUser, 
  onRoomChange 
}: RoomSidebarProps) {
  const getMessageCount = (room: Room) => {
    // In a real app, this would come from the room data
    const counts: Record<string, number> = {
      "genel-sohbet": 24,
      "random": 8,
      "oyun": 2,
      "müzik": 0,
    };
    return counts[room.name] || 0;
  };

  const getCountColor = (count: number) => {
    if (count === 0) return "hidden";
    if (count < 5) return "bg-red-500";
    if (count < 15) return "bg-[var(--discord-yellow)] text-black";
    return "bg-[var(--discord-blurple)]";
  };

  return (
    <div className="w-72 bg-[var(--discord-darker)] flex flex-col border-r border-[var(--discord-dark)]">
      <div className="p-4 border-b border-[var(--discord-dark)]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--discord-blurple)]">IBX</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-dark)]"
            title="Yeni Oda Ekle"
          >
            <Plus className="w-4 h-4" />
          </Button>
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
                  className={`w-full justify-start px-2 py-2 h-auto hover:bg-[var(--discord-dark)] transition-colors group ${
                    isActive ? "bg-[var(--discord-dark)]/50" : ""
                  }`}
                  onClick={() => onRoomChange(room)}
                >
                  <Hash className="text-[var(--discord-light)]/50 text-sm mr-2 w-4 h-4" />
                  <span className="flex-1 text-left text-[var(--discord-light)]">
                    {room.name}
                  </span>
                  {messageCount > 0 && (
                    <span className={`text-xs px-2 py-1 rounded-full ${getCountColor(messageCount)}`}>
                      {messageCount}
                    </span>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
      
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
            </p>
            <p className="text-xs text-[var(--discord-light)]/50">Çevrimiçi</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-dark)] p-1"
            title="Ayarlar"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
