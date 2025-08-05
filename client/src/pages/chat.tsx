import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import UserRegistrationModal from "@/components/user-registration-modal";
import RoomSidebar from "@/components/room-sidebar";
import MainChatArea from "@/components/main-chat-area";
import UserListSidebar from "@/components/user-list-sidebar";
import type { User, Room } from "@shared/schema";

export default function Chat() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [showRegistration, setShowRegistration] = useState(true);

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
    <div className="flex h-screen overflow-hidden">
      <RoomSidebar
        rooms={Array.isArray(rooms) ? rooms : []}
        currentRoom={currentRoom}
        currentUser={currentUser}
        onRoomChange={handleRoomChange}
        onLogout={handleLogout}
      />
      <MainChatArea
        currentRoom={currentRoom}
        currentUser={currentUser}
      />
      <UserListSidebar users={Array.isArray(onlineUsers) ? onlineUsers : []} />
    </div>
  );
}
