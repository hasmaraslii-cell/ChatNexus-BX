import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, User as UserIcon } from "lucide-react";

export default function AuthPage() {
  const { user, login, register, isLoggingIn, isRegistering } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  if (user) {
    setLocation("/");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ username, password });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    await register({ username, password, displayName });
  };

  const nexusLogo = "https://i.imgur.com/DvliwXN.png";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#c6dfff] to-[#f7c6e9] p-4 font-sans">
      <Card className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 shadow-2xl overflow-hidden rounded-2xl">
        <CardHeader className="pt-8 pb-4">
          <div className="flex justify-center mb-4">
            <img src={nexusLogo} alt="Nexus Logo" className="h-20 w-auto object-contain drop-shadow-lg" />
          </div>
          <CardTitle className="text-3xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-pink-600">
            Chat Nexus
          </CardTitle>
          <p className="text-center text-slate-500 text-sm mt-1">Gerçek zamanlı sohbetin merkezi</p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 shadow-sm transition-all">
                Giriş Yap
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 shadow-sm transition-all">
                Kayıt Ol
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Kullanıcı Adı</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="kullanıcıadınız"
                      className="pl-10 h-11 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Şifre</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 h-11 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98]" disabled={isLoggingIn}>
                  {isLoggingIn ? "Giriş Yapılıyor..." : "Nexus'a Bağlan"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Görünen Ad</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Örn: Raith"
                      className="pl-10 h-11 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500/20 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Kullanıcı Adı</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="kullanıcıadınız"
                      className="pl-10 h-11 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500/20 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Şifre</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 karakter"
                      className="pl-10 h-11 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500/20 transition-all"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 mt-6 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold rounded-xl shadow-lg shadow-pink-500/30 transition-all active:scale-[0.98]" disabled={isRegistering}>
                  {isRegistering ? "Hesap Oluşturuluyor..." : "Nexus'a Katıl"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
