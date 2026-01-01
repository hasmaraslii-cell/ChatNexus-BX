import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Room, User, MessageWithUser } from "@shared/schema";
import RoomSidebar from "@/components/room-sidebar";
import MainChatArea from "@/components/main-chat-area";
import UserList from "@/components/user-list";
import ProfileEditModal from "@/components/profile-edit-modal";
import { apiRequest } from "@/lib/queryClient";

export default function Chat() {
  const { user, logoutMutation } = useAuth();
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [editingProfile, setEditingProfile] = useState<User | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<MessageWithUser | null>(null);
  const queryClient = useQueryClient();

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  useEffect(() => {
    if (rooms.length > 0 && !currentRoom) {
      setCurrentRoom(rooms[0]);
    }
  }, [rooms, currentRoom]);

  const startDMMutation = useMutation({
    mutationFn: async (otherUser: User) => {
      const res = await apiRequest("POST", "/api/dm", { userId: otherUser.id });
      return res.json();
    },
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm", user?.id] });
      setCurrentRoom(room);
    },
  });

  if (!user) return null;

  return (
    <div className="flex h-screen w-full nexus-gradient overflow-hidden p-4 gap-4">
      <div className="w-72 glass-card rounded-3xl overflow-hidden shrink-0">
        <RoomSidebar
          rooms={rooms}
          currentRoom={currentRoom}
          currentUser={user}
          onRoomChange={setCurrentRoom}
          onLogout={() => logoutMutation.mutate()}
          onEditProfile={setEditingProfile}
        />
      </div>

      <div className="flex-1 glass-card rounded-3xl overflow-hidden flex flex-col">
        {currentRoom && (
          <MainChatArea
            currentRoom={currentRoom}
            currentUser={user}
            replyToMessage={replyToMessage}
            onClearReply={() => setReplyToMessage(null)}
            onReply={setReplyToMessage}
            onStartDM={(targetUser) => startDMMutation.mutate(targetUser)}
          />
        )}
      </div>

      <div className="w-64 glass-card rounded-3xl overflow-hidden shrink-0">
        <UserList onStartDM={(targetUser) => startDMMutation.mutate(targetUser)} />
      </div>

      {editingProfile && (
        <ProfileEditModal
          user={editingProfile}
          isOpen={!!editingProfile}
          onClose={() => setEditingProfile(null)}
        />
      )}
    </div>
  );
}
