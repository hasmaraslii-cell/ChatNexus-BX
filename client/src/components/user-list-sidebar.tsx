import type { User } from "@shared/schema";

interface UserListSidebarProps {
  users: User[];
}

export default function UserListSidebar({ users }: UserListSidebarProps) {
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

  return (
    <div className="w-60 bg-[var(--discord-darker)] border-l border-[var(--discord-dark)]">
      <div className="p-4 border-b border-[var(--discord-dark)]">
        <h3 className="font-semibold text-[var(--discord-light)]">
          Çevrimiçi Kullanıcılar
        </h3>
        <p className="text-xs text-[var(--discord-light)]/50 mt-1">
          {users.length} kişi aktif
        </p>
      </div>
      
      <div className="p-2 space-y-1">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[var(--discord-dark)] transition-colors cursor-pointer"
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
              <p className="text-sm font-medium text-[var(--discord-light)] truncate">
                {user.username}
              </p>
              <p className="text-xs text-[var(--discord-light)]/50">
                {getStatusText(user.status)}
              </p>
            </div>
          </div>
        ))}
        
        {users.length === 0 && (
          <div className="text-center p-4">
            <p className="text-[var(--discord-light)]/50 text-sm">
              Çevrimiçi kullanıcı yok
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
