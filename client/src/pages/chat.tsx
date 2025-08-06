import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import UserRegistrationModal from "@/components/user-registration-modal";
import RoomSidebar from "@/components/room-sidebar";
import MainChatArea from "@/components/main-chat-area";
import UserListSidebar from "@/components/user-list-sidebar";
import ProfileEditModal from "@/components/profile-edit-modal";
import BanUserModal from "@/components/ban-user-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Menu, X, Users } from "lucide-react";
import type { User, Room } from "@shared/schema";

export default function Chat() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [showRegistration, setShowRegistration] = useState(true);
  const [profileEditUser, setProfileEditUser] = useState<User | null>(null);
  const [banUser, setBanUser] = useState<User | null>(null);
  const [showRoomSidebar, setShowRoomSidebar] = useState(false);
  const [showUserSidebar, setShowUserSidebar] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const isMobile = useIsMobile();

  const { data: rooms } = useQuery({
    queryKey: ["/api/rooms"],
    enabled: !!currentUser,
  });

  const { data: onlineUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/users/online"],
    enabled: !!currentUser,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Set default room when rooms are loaded
  useEffect(() => {
    if (rooms && Array.isArray(rooms) && rooms.length > 0 && !currentRoom) {
      const generalRoom = rooms.find((room: Room) => room.name === "genel-sohbet") || rooms[0];
      setCurrentRoom(generalRoom);
    }
  }, [rooms, currentRoom]);

  // Check if user is already registered (auto-login)
  useEffect(() => {
    const savedUser = localStorage.getItem("ibx-user");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setShowRegistration(false);
        
        // Update user status to online automatically
        fetch(`/api/users/${user.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'online' })
        }).catch(console.error);
        
      } catch (error) {
        localStorage.removeItem("ibx-user");
      }
    }
  }, []);

  const handleUserRegistration = (user: User) => {
    setCurrentUser(user);
    setShowRegistration(false);
    localStorage.setItem("ibx-user", JSON.stringify(user));
    refetchUsers();
  };

  const handleRoomChange = (room: Room) => {
    setCurrentRoom(room);
  };

  const handleLogout = () => {
    localStorage.removeItem("ibx-user");
    setCurrentUser(null);
    setCurrentRoom(null);
    setShowRegistration(true);
  };

  const handleEditProfile = (user: User) => {
    setProfileEditUser(user);
    if (isMobile) {
      setShowUserSidebar(false);
    }
  };

  const handleBanUser = (user: User) => {
    setBanUser(user);
    if (isMobile) {
      setShowUserSidebar(false);
    }
  };

  const handleReply = (message: any) => {
    setReplyToMessage(message);
  };

  if (showRegistration) {
    return <UserRegistrationModal onUserCreated={handleUserRegistration} />;
  }

  if (!currentUser || !currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Mobile Menu Button */}
      {isMobile && (
        <div className="absolute top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRoomSidebar(!showRoomSidebar)}
            className="text-[var(--discord-light)] bg-[var(--discord-darker)]/80 backdrop-blur-sm"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Mobile User List Button */}
      {isMobile && (
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUserSidebar(!showUserSidebar)}
            className="text-[var(--discord-light)] bg-[var(--discord-darker)]/80 backdrop-blur-sm"
          >
            <Users className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Room Sidebar */}
      <div className={`${
        isMobile 
          ? `fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ${
              showRoomSidebar ? 'translate-x-0' : '-translate-x-full'
            }`
          : ''
      }`}>
        <RoomSidebar
          rooms={Array.isArray(rooms) ? rooms : []}
          currentRoom={currentRoom}
          currentUser={currentUser}
          onRoomChange={handleRoomChange}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <MainChatArea
          currentRoom={currentRoom}
          currentUser={currentUser}
          replyToMessage={replyToMessage}
          onClearReply={() => setReplyToMessage(null)}
          onReply={handleReply}
        />
      </div>

      {/* User List Sidebar */}
      <div className={`${
        isMobile 
          ? `fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ${
              showUserSidebar ? 'translate-x-0' : 'translate-x-full'
            }`
          : ''
      }`}>
        <UserListSidebar 
          users={Array.isArray(onlineUsers) ? onlineUsers : []} 
          currentUserId={currentUser?.id}
          onEditProfile={handleEditProfile}
          onBanUser={handleBanUser}
        />
      </div>

      {/* Mobile Overlay */}
      {isMobile && (showRoomSidebar || showUserSidebar) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => {
            setShowRoomSidebar(false);
            setShowUserSidebar(false);
          }}
        />
      )}

      {/* Profile Edit Modal */}
      <ProfileEditModal
        user={profileEditUser}
        isOpen={!!profileEditUser}
        onClose={() => setProfileEditUser(null)}
      />

      {/* Ban User Modal */}
      <BanUserModal
        user={banUser}
        isOpen={!!banUser}
        onClose={() => setBanUser(null)}
      />
    </div>
  );
}
