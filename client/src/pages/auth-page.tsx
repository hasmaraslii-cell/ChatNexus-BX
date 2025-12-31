import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--discord-darker)] p-4">
      <Card className="w-full max-w-md bg-[var(--discord-dark)] border-[var(--discord-darker)]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-white">Chat Nexus</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 bg-[var(--discord-darker)]">
              <TabsTrigger value="login" className="text-[var(--discord-light)]">Giriş Yap</TabsTrigger>
              <TabsTrigger value="register" className="text-[var(--discord-light)]">Kayıt Ol</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-[var(--discord-light)]">Kullanıcı Adı</Label>
                  <Input 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-[var(--discord-darker)] border-none text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--discord-light)]">Şifre</Label>
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[var(--discord-darker)] border-none text-white"
                  />
                </div>
                <Button type="submit" className="w-full bg-[var(--discord-blurple)] hover:bg-[var(--discord-blurple)]/80" disabled={isLoggingIn}>
                  Giriş Yap
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-[var(--discord-light)]">Görünen Ad</Label>
                  <Input 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-[var(--discord-darker)] border-none text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--discord-light)]">Kullanıcı Adı</Label>
                  <Input 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-[var(--discord-darker)] border-none text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--discord-light)]">Şifre</Label>
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[var(--discord-darker)] border-none text-white"
                  />
                </div>
                <Button type="submit" className="w-full bg-[var(--discord-blurple)] hover:bg-[var(--discord-blurple)]/80" disabled={isRegistering}>
                  Kayıt Ol
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
