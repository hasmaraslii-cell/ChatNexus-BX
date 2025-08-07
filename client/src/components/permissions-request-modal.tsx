import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { Bell, HardDrive, Check } from "lucide-react";

interface PermissionsRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PermissionsRequestModal({ isOpen, onClose }: PermissionsRequestModalProps) {
  const { permissions, requestAllPermissions } = usePermissions();
  const [requesting, setRequesting] = useState(false);
  const [granted, setGranted] = useState({ notifications: false, storage: false });

  useEffect(() => {
    setGranted({
      notifications: permissions.notifications === 'granted',
      storage: permissions.storage
    });
  }, [permissions]);

  const handleRequestPermissions = async () => {
    setRequesting(true);
    
    try {
      const results = await requestAllPermissions();
      setGranted(results);
      
      // Close modal after a short delay if both permissions granted
      if (results.notifications || results.storage) {
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[var(--discord-darker)] border-[var(--discord-dark)]">
        <DialogTitle className="text-[var(--discord-light)] text-xl font-semibold mb-2">
          Uygulama İzinleri
        </DialogTitle>
        <DialogDescription className="text-[var(--discord-light)]/70 mb-6">
          IBX'i tam özelliklerle kullanabilmeniz için aşağıdaki izinlere ihtiyacımız var:
        </DialogDescription>
        
        <div className="space-y-4 mb-6">
          <div className="flex items-center space-x-3 p-3 bg-[var(--discord-dark)] rounded-lg">
            <div className="flex-shrink-0">
              {granted.notifications ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Bell className="w-5 h-5 text-[var(--discord-blurple)]" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-[var(--discord-light)]">Bildirimler</div>
              <div className="text-sm text-[var(--discord-light)]/70">
                Yeni mesajlar için anlık bildirim alın
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-[var(--discord-dark)] rounded-lg">
            <div className="flex-shrink-0">
              {granted.storage ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <HardDrive className="w-5 h-5 text-[var(--discord-blurple)]" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-[var(--discord-light)]">Depolama</div>
              <div className="text-sm text-[var(--discord-light)]/70">
                Çevrimdışı kullanım için verileri saklayın
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={onClose}
            variant="ghost"
            className="flex-1 text-[var(--discord-light)] hover:bg-[var(--discord-dark)]"
          >
            Şimdi Değil
          </Button>
          <Button
            onClick={handleRequestPermissions}
            disabled={requesting}
            className="flex-1 bg-[var(--discord-blurple)] hover:bg-[var(--discord-blurple)]/80"
          >
            {requesting ? "İsteniyor..." : "İzin Ver"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}