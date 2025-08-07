import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface LogoutButtonProps {
  currentUser: User;
  onLogout: () => void;
}

export default function LogoutButton({ currentUser, onLogout }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    setIsLoading(true);
    
    try {
      // Delete the user account
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfDelete: true })
      });

      if (!response.ok) {
        throw new Error('Çıkış yapılırken hata oluştu');
      }

      // Clear local storage
      localStorage.removeItem('currentUser');
      
      toast({
        title: "Başarılı",
        description: "Hesabınız silindi ve çıkış yaptınız",
      });

      // Call logout callback
      onLogout();
      
    } catch (error) {
      toast({
        title: "Hata",
        description: "Çıkış yapılırken hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          disabled={isLoading}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Çıkış Yap
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-[var(--discord-darker)] border-[var(--discord-dark)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--discord-light)]">
            Hesabı Sil ve Çıkış Yap
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--discord-light)]/70">
            Çıkış yaptığınızda hesabınız ve tüm mesajlarınız kalıcı olarak silinecektir. Bu işlem geri alınamaz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-[var(--discord-dark)] text-[var(--discord-light)] hover:bg-[var(--discord-dark)]/80">
            İptal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLogout}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? "Siliniyor..." : "Hesabı Sil ve Çıkış Yap"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}