import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Cadastro from "./pages/Cadastro.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from './pages/admin/Login';
import AssinaturaExterna from './pages/AssinaturaExterna';
import Dashboard from './pages/admin/Dashboard';
import ConsultaStatus from './pages/ConsultaStatus';
import ProtectedRoute from './components/ProtectedRoute';
import { ReloadPrompt } from "./components/ReloadPrompt";
import Carteirinha from './pages/Carteirinha';
import ConsultaCarteirinha from './pages/ConsultaCarteirinha';


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/consulta" element={<ConsultaStatus />} />
          <Route path="/assinatura/:cpf" element={<AssinaturaExterna />} />
          <Route path="/carteirinha/:cpf" element={<Carteirinha />} />
          <Route path="/acessar-carteirinha" element={<ConsultaCarteirinha />} />
          <Route path="/admin/login" element={<Login />} />
          
          {/* Rotas Protegidas */}
          <Route path="/admin" element={<ProtectedRoute />}>
            <Route path="dashboard" element={<Dashboard />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ReloadPrompt />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
