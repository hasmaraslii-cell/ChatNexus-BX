import { useState, useEffect, useCallback } from "react";
import MainChatArea from "@/components/main-chat-area";
import UserListSidebar from "@/components/user-list-sidebar";
import ProfileEditModal from "@/components/profile-edit-modal";
import RoomSidebar from "@/components/room-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { User, Room, MessageWithUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Hash, Users, LogOut, Settings } from "lucide-react";

export default function Chat() {
  const { user: authUser, isLoading: authLoading, logout } = useAuth();
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [profileEditUser, setProfileEditUser] = useState<User | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<MessageWithUser | null>(null);
  const [showRoomSidebar, setShowRoomSidebar] = useState(false);
  const [showUserSidebar, setShowUserSidebar] = useState(false);

  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const nexusLogo = "https://i.imgur.com/DvliwXN.png";

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    enabled: !!authUser,
  });

  const { data: onlineUsers } = useQuery<User[]>({
    queryKey: ["/api/users/online"],
    enabled: !!authUser,
    refetchInterval: 10000,
  });

  const { data: offlineUsers } = useQuery<User[]>({
    queryKey: ["/api/users/offline"],
    enabled: !!authUser,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (rooms && rooms.length > 0) {
      const generalRoom = rooms.find((r: Room) => r.name === "💬｜sohbet") || rooms[0];
      setCurrentRoom(generalRoom);
    }
  }, [rooms]);

  const handleRoomChange = (room: Room) => {
    setCurrentRoom(room);
    if (isMobile) setShowRoomSidebar(false);
  };

  const handleReply = useCallback((message: MessageWithUser) => {
    setReplyToMessage(message);
  }, []);

  const handleClearReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 mx-auto mb-4 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          <p className="text-blue-400 font-medium tracking-wide animate-pulse">Nexus Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!authUser) return null;

  if (!currentRoom && rooms && rooms.length > 0) {
    // We have rooms but none selected yet, don't show blank screen
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans">
        <div className="animate-pulse text-blue-400">Oda yükleniyor...</div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans">
        <div className="text-center p-8 bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-slate-300 font-medium">Odalar hazırlanıyor...</p>
          <p className="text-slate-500 text-sm mt-2">Lütfen bekleyin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans text-slate-200">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-14 z-50 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
          <Button variant="ghost" size="icon" onClick={() => setShowRoomSidebar(!showRoomSidebar)}>
            <Hash className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src={nexusLogo} alt="Logo" className="h-6 w-auto" />
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-400">
              Nexus
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowUserSidebar(!showUserSidebar)}>
            <Users className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Room Sidebar */}
      <div className={`${isMobile ? 'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ' + (showRoomSidebar ? 'translate-x-0' : '-translate-x-full') : 'w-64 border-r border-slate-800'} bg-slate-900/50 backdrop-blur-xl`}>
        <RoomSidebar 
          rooms={rooms || []} 
          currentRoom={currentRoom} 
          currentUser={authUser} 
          onRoomChange={handleRoomChange}
          onLogout={logout}
          onEditProfile={setProfileEditUser}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${isMobile ? 'pt-14' : ''}`}>
        <header className={`${isMobile ? 'hidden' : 'h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/30'}`}>
          <div className="flex items-center gap-3">
            <img src={nexusLogo} alt="Nexus" className="h-8 w-auto object-contain" />
            <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-pink-400">
              Chat Nexus
            </span>
            <div className="h-4 w-px bg-slate-700 mx-2" />
            <span className="text-slate-400 font-medium">{currentRoom.name}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
              <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-sm font-semibold text-slate-300">
                {authUser.displayName || authUser.username}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setProfileEditUser(authUser)} className="hover:bg-slate-800 text-slate-400">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => logout()} className="hover:bg-rose-500/10 text-slate-400 hover:text-rose-400">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          <MainChatArea 
            currentRoom={currentRoom} 
            currentUser={authUser}
            replyToMessage={replyToMessage}
            onClearReply={handleClearReply}
            onReply={handleReply}
            onStartDM={() => {}}
          />
          
          {!isMobile && (
            <div className="w-64 border-l border-slate-800 bg-slate-900/20">
              <UserListSidebar 
                onlineUsers={onlineUsers || []}
                offlineUsers={offlineUsers || []}
                currentUserId={authUser.id}
                onEditProfile={setProfileEditUser}
                onStartDM={() => {}}
              />
            </div>
          )}
        </main>
      </div>

      {/* Mobile User List Sidebar */}
      {isMobile && (
        <div className={`fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ${showUserSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
          <UserListSidebar 
            onlineUsers={onlineUsers || []}
            offlineUsers={offlineUsers || []}
            currentUserId={authUser.id}
            onEditProfile={setProfileEditUser}
            onStartDM={() => {}}
          />
        </div>
      )}

      {/* Overlays */}
      {isMobile && (showRoomSidebar || showUserSidebar) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => { setShowRoomSidebar(false); setShowUserSidebar(false); }} />
      )}

      <ProfileEditModal
        user={profileEditUser}
        isOpen={!!profileEditUser}
        onClose={() => setProfileEditUser(null)}
        onProfileUpdate={() => queryClient.invalidateQueries({ queryKey: ["/api/user"] })}
      />
    </div>
  );
}
