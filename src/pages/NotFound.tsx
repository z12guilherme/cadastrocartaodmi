import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    
    // Hack para PWA: Se o usuário tem uma versão antiga do site em cache (Service Worker) 
    // e tenta acessar uma rota nova (como a carteirinha), o React não acha a rota e cai aqui.
    // Forçamos um F5 automático na primeira vez para ele baixar a versão nova do sistema!
    const cacheBustKey = `dmi_reloaded_${location.pathname}`;
    if (!sessionStorage.getItem(cacheBustKey)) {
      sessionStorage.setItem(cacheBustKey, "true");
      setIsReloading(true);
      window.location.reload();
    }
  }, [location.pathname]);

  if (isReloading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5FF] mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Atualizando o sistema...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
