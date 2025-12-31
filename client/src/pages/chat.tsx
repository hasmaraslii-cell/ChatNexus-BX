import { useState, useEffect, useCallback } from "react";
import UserRegistrationModal from "@/components/user-registration-modal";
import RoomSidebar from "@/components/room-sidebar";
import MainChatArea from "@/components/main-chat-area";
import UserListSidebar from "@/components/user-list-sidebar";
import ProfileEditModal from "@/components/profile-edit-modal";
import { useAuth } from "@/hooks/use-auth";
import { redirectToLogin } from "@/lib/auth-utils";

import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Users, Hash } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { User, Room, MessageWithUser } from "@shared/schema";

export default function Chat() {
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [profileEditUser, setProfileEditUser] = useState<User | null>(null);

  const [showRoomSidebar, setShowRoomSidebar] = useState(false);
  const [showUserSidebar, setShowUserSidebar] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<MessageWithUser | null>(null);

  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      redirectToLogin(toast);
    } else if (authUser) {
      setCurrentUser(authUser as any);
    }
  }, [authLoading, isAuthenticated, authUser, toast]);

  const startDMMutation = useMutation({
    mutationFn: async (targetUser: User) => {
      if (!currentUser) throw new Error('Kullanıcı girişi gerekli');
      
      const response = await fetch('/api/dm/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user1Id: currentUser.id,
          user2Id: targetUser.id
        })
      });
      if (!response.ok) throw new Error('DM odası oluşturulamadı');
      return response.json();
    },
    onSuccess: (dmRoom: Room) => {
      setCurrentRoom(dmRoom);
      toast({
        title: "Özel mesajlaşma başlatıldı",
        description: `${dmRoom.name} ile özel sohbet`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dm", currentUser?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "DM başlatılamadı",
        variant: "destructive",
      });
    },
  });

  const handleStartDM = (targetUser: User) => {
    if (!currentUser) {
      toast({
        title: "Hata",
        description: "Kullanıcı girişi gerekli",
        variant: "destructive",
      });
      return;
    }
    
    if (targetUser.id === currentUser.id) {
      toast({
        title: "Hata",
        description: "Kendinizle DM başlatamazsınız",
        variant: "destructive",
      });
      return;
    }
    startDMMutation.mutate(targetUser);
  };

  const { data: rooms } = useQuery({
    queryKey: ["/api/rooms"],
    enabled: !!currentUser,
    staleTime: 30000,
  });

  const { data: onlineUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/users/online"],
    enabled: !!currentUser,
    refetchInterval: isMobile ? 45000 : 30000,
    staleTime: isMobile ? 35000 : 25000,
  });

  const { data: offlineUsers } = useQuery({
    queryKey: ["/api/users/offline"],
    enabled: !!currentUser,
    refetchInterval: isMobile ? 180000 : 120000,
    staleTime: isMobile ? 120000 : 90000,
  });

  useEffect(() => {
    if (rooms && Array.isArray(rooms) && rooms.length > 0 && !currentRoom) {
      const generalRoom = rooms.find((room: Room) => room.name === "💬｜sohbet") || rooms[0];
      setCurrentRoom(generalRoom);
    }
  }, [rooms, currentRoom]);

  const handleRoomChange = (room: Room) => {
    setCurrentRoom(room);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleProfileUpdate = (updatedUser: User) => {
    if (currentUser && updatedUser.id === currentUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleEditProfile = (user: User) => {
    setProfileEditUser(user);
    if (isMobile) {
      setShowRoomSidebar(false);
      setShowUserSidebar(false);
    }
  };

  const handleReply = useCallback((message: MessageWithUser) => {
    setReplyToMessage(message);
  }, []);

  const handleClearReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--discord-darker)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Chat Nexus Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !currentRoom) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--discord-darker)] border-b border-[var(--discord-dark)] flex items-center justify-between px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRoomSidebar(!showRoomSidebar)}
            className="text-[var(--discord-light)] hover:bg-[var(--discord-dark)] p-2"
            data-testid="button-toggle-rooms"
            title="Odalar"
          >
            <Hash className="w-5 h-5" />
          </Button>

          <div className="flex items-center space-x-2 flex-1 justify-center">
            <Hash className="w-4 h-4 text-[var(--discord-light)]/70" />
            <span className="text-[var(--discord-light)] font-medium truncate">
              {currentRoom.name}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUserSidebar(!showUserSidebar)}
            className="text-[var(--discord-light)] hover:bg-[var(--discord-dark)] p-2"
            data-testid="button-toggle-users"
            title="Kullanıcılar"
          >
            <Users className="w-5 h-5" />
          </Button>
        </div>
      )}

      <div className={`${
        isMobile 
          ? `fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ${
              showRoomSidebar ? 'translate-x-0' : '-translate-x-full'
            } ${isMobile ? 'pt-12' : ''}`
          : ''
      }`}>
        <RoomSidebar
          rooms={Array.isArray(rooms) ? rooms : []}
          currentRoom={currentRoom}
          currentUser={currentUser}
          onRoomChange={handleRoomChange}
          onLogout={handleLogout}
          onEditProfile={handleEditProfile}
        />
      </div>

      <div className={`flex-1 flex flex-col overflow-hidden ${isMobile ? 'pt-12' : ''}`}>
        <MainChatArea
          currentRoom={currentRoom}
          currentUser={currentUser}
          replyToMessage={replyToMessage}
          onClearReply={handleClearReply}
          onReply={handleReply}
          onStartDM={handleStartDM}
        />
      </div>

      <div className={`${
        isMobile 
          ? `fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ${
              showUserSidebar ? 'translate-x-0' : 'translate-x-full'
            } ${isMobile ? 'pt-12' : ''}`
          : ''
      }`}>
        <UserListSidebar 
          onlineUsers={Array.isArray(onlineUsers) ? onlineUsers : []}
          offlineUsers={Array.isArray(offlineUsers) ? offlineUsers : []}
          currentUserId={currentUser?.id}
          onEditProfile={handleEditProfile}
          onStartDM={handleStartDM}
        />
      </div>

      {isMobile && (showRoomSidebar || showUserSidebar) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => {
            setShowRoomSidebar(false);
            setShowUserSidebar(false);
          }}
          data-testid="mobile-overlay"
        />
      )}

      <ProfileEditModal
        user={profileEditUser}
        isOpen={!!profileEditUser}
        onClose={() => setProfileEditUser(null)}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
}
