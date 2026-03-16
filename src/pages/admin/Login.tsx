import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import logoDmi from "@/assets/logo-dmi.png";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        toast.success("Login realizado com sucesso!");
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      toast.error('Erro ao fazer login', {
        description: err.message || 'Verifique suas credenciais e tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0EA5FF]/10 via-background to-background p-4 relative overflow-hidden">
      
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#0EA5FF]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#64E627]/5 rounded-full blur-3xl" />

      {/* Container Principal */}
      <div className="w-full max-w-md bg-card/80 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Cabeçalho */}
        <div className="flex flex-col items-center mb-8 text-center space-y-4">
          <div className="bg-white p-3 rounded-full shadow-sm border border-border/50">
            <img 
              src={logoDmi} 
              alt="Logo Cartão DMI" 
              className="w-16 h-16 object-contain" 
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Acesso Restrito
            </h1>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0EA5FF]" />
              Painel de Gestão - Cartão DMI
            </p>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail Corporativo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@cartaodmi.com.br"
                  className="pl-9 bg-background/50 focus:bg-background transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 bg-background/50 focus:bg-background transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#0EA5FF] hover:bg-[#0EA5FF]/90 text-white shadow-md transition-all hover:shadow-lg h-11" 
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Entrar no Sistema"
            )}
          </Button>
        </form>

        {/* Rodapé */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Rede DMI. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}