import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Menu, 
  Hash, 
  Plus, 
  Settings, 
  User as UserIcon, 
  LogOut, 
  ChevronDown, 
  ChevronRight,
  Crown,
  UserCog,
  Ban,
  Shield,
  GripVertical,
  Edit
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import AdminPanel from "@/components/admin-panel";
import type { Room, User } from "@shared/schema";

interface MobileMenuProps {
  rooms: Room[];
  currentRoom: Room;
  currentUser: User;
  onlineUsers: User[];
  offlineUsers: User[];
  onRoomChange: (room: Room) => void;
  onLogout: () => void;
  onEditProfile?: (user: User) => void;
  onBanUser?: (user: User) => void;
  onStartDM?: (user: User) => void;
}

export default function MobileMenu({
  rooms,
  currentRoom,
  currentUser,
  onlineUsers = [],
  offlineUsers = [],
  onRoomChange,
  onLogout,
  onEditProfile,
  onBanUser,
  onStartDM
}: MobileMenuProps) {
  const [showOnline, setShowOnline] = useState(true);
  const [showOffline, setShowOffline] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "busy": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online": return "Çevrimiçi";
      case "away": return "Uzakta";
      case "busy": return "Meşgul";
      default: return "Çevrimdışı";
    }
  };

  const getUserColor = (userId: string) => {
    const colors = [
      "bg-green-500", "bg-blue-500", "bg-purple-500", "bg-orange-500",
      "bg-pink-500", "bg-red-500", "bg-yellow-500", "bg-indigo-500",
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

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-[var(--discord-light)] hover:bg-[var(--discord-dark)] p-2"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="left" 
        className="w-full max-w-xs sm:w-80 p-0 bg-[var(--discord-darker)] border-[var(--discord-dark)] overflow-hidden"
      >
        <div className="flex flex-col h-full">
          {/* Server Header */}
          <div className="p-4 border-b border-[var(--discord-dark)]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--discord-blurple)]">IBX</h2>
              {currentUser.isAdmin && (
                <div className="flex items-center space-x-1">
                  <Crown className="w-4 h-4 text-[var(--discord-yellow)]" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Rooms Section */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs uppercase text-[var(--discord-light)]/50 font-semibold">
                  Odalar
                </h3>
              </div>
              
              {rooms.map((room) => {
                const messageCount = room.messageCount || 0;
                const isActive = currentRoom.id === room.id;
                
                return (
                  <div key={room.id} className="mb-1">
                    <Button
                      variant="ghost"
                      className={`w-full justify-start px-3 py-2.5 h-auto hover:bg-[var(--discord-dark)] transition-colors group text-sm cursor-pointer ${
                        isActive ? "bg-[var(--discord-dark)]/50 border-l-2 border-[var(--discord-blurple)]" : ""
                      }`}
                      onClick={() => onRoomChange(room)}
                      data-testid={`room-${room.name}`}
                    >
                      <Hash className="text-[var(--discord-light)]/50 text-sm mr-2 w-4 h-4" />
                      <span className="flex-1 text-left text-[var(--discord-light)]">
                        {room.name}
                      </span>
                      {messageCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {messageCount}
                        </Badge>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            <Separator className="bg-[var(--discord-dark)]" />

            {/* Users Section */}
            <div className="p-3">
              {/* Online Users */}
              <div className="mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOnline(!showOnline)}
                  className="w-full justify-start p-0 hover:bg-transparent text-[var(--discord-light)]/70 hover:text-[var(--discord-light)]"
                >
                  {showOnline ? (
                    <ChevronDown className="w-3 h-3 mr-1" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mr-1" />
                  )}
                  <span className="text-xs uppercase font-semibold">
                    Çevrimiçi — {onlineUsers.length}
                  </span>
                </Button>

                {showOnline && (
                  <div className="mt-2 space-y-1">
                    {onlineUsers.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-[var(--discord-dark)]/50">
                        <div className="relative">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden ${getUserColor(user.id)}`}>
                            {user.profileImage ? (
                              <img 
                                src={user.profileImage} 
                                alt={user.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserIcon className="text-white text-xs w-3 h-3" />
                            )}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--discord-darker)] ${getStatusColor(user.status)}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => onStartDM?.(user)}
                              className="text-sm text-[var(--discord-light)] truncate hover:text-[var(--discord-blurple)] hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
                            >
                              {user.username}
                            </button>
                            {user.isAdmin && (
                              <Crown className="w-3 h-3 text-[var(--discord-yellow)]" />
                            )}
                          </div>
                          <span className="text-xs text-[var(--discord-light)]/50">
                            {getStatusText(user.status)}
                          </span>
                        </div>

                        {/* User Actions */}
                        {(currentUser.id === user.id || currentUser.isAdmin) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Settings className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[var(--discord-darker)] border-[var(--discord-dark)]">
                              {currentUser.id === user.id && (
                                <DropdownMenuItem 
                                  onClick={() => handleUserAction(user, "edit")}
                                  className="text-[var(--discord-light)] hover:bg-[var(--discord-dark)]"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Profili Düzenle
                                </DropdownMenuItem>
                              )}
                              {currentUser.isAdmin && currentUser.id !== user.id && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleUserAction(user, "edit")}
                                    className="text-[var(--discord-light)] hover:bg-[var(--discord-dark)]"
                                  >
                                    <UserCog className="w-4 h-4 mr-2" />
                                    Kullanıcı Yönet
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleUserAction(user, "ban")}
                                    className="text-red-400 hover:bg-[var(--discord-dark)]"
                                  >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Yasakla
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hide offline users section in mobile as requested */}
            </div>
          </div>

          {/* Admin Panel */}
          {currentUser.isAdmin && (
            <div className="border-t border-[var(--discord-dark)] p-3">
              <AdminPanel currentUser={currentUser} rooms={rooms} />
            </div>
          )}

          {/* User Profile Footer */}
          <div className="p-3 border-t border-[var(--discord-dark)]">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-[var(--discord-blurple)] rounded-full flex items-center justify-center overflow-hidden">
                  {currentUser.profileImage ? (
                    <img 
                      src={currentUser.profileImage} 
                      alt={currentUser.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="text-white text-sm w-4 h-4" />
                  )}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--discord-darker)] ${getStatusColor(currentUser.status)}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <p className="text-sm font-medium truncate text-[var(--discord-light)]">
                    {currentUser.username}
                  </p>
                  {currentUser.isAdmin && (
                    <Crown className="w-3 h-3 text-[var(--discord-yellow)]" />
                  )}
                </div>
                <p className="text-xs text-[var(--discord-light)]/50">
                  {getStatusText(currentUser.status)}
                </p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--discord-light)]/70 hover:text-[var(--discord-light)] hover:bg-[var(--discord-dark)]"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[var(--discord-darker)] border-[var(--discord-dark)]">
                  <DropdownMenuItem 
                    onClick={() => onEditProfile?.(currentUser)}
                    className="text-[var(--discord-light)] hover:bg-[var(--discord-dark)]"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Profili Düzenle
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[var(--discord-dark)]" />
                  <DropdownMenuItem 
                    onClick={onLogout}
                    className="text-red-400 hover:bg-[var(--discord-dark)]"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}