import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Carteirinha from '@/pages/Carteirinha';
import { supabase } from '@/lib/supabase';

// Mock das dependências externas
vi.mock('@/services/api', () => ({
    buscarDadosCarteirinha: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
    supabase: {
        functions: {
            invoke: vi.fn(),
        },
    },
}));

// Mock do QRCode (biblioteca externa que usa canvas/svg e pode quebrar o JSDOM no node)
vi.mock('react-qr-code', () => ({
    default: () => <div data-testid="mock-qrcode">QR Code</div>,
}));

describe('Fluxo Crítico: Carteirinha Digital', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    it('deve exibir a tela de carregamento inicialmente', () => {
        sessionStorage.setItem('dmi_carteirinha_cpf', '12345678900');

        // Simulando uma Promise que ainda não resolveu para pegarmos o estado de loading
        vi.mocked(supabase.functions.invoke).mockImplementationOnce(() => new Promise(() => { }));

        const { container } = render(
            <MemoryRouter>
                <Carteirinha />
            </MemoryRouter>
        );

        // Verifica se existe o ícone de carregamento (Spinner do Lucide) na tela
        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('deve exibir tela de erro e bloquear acesso se cliente não existir no SIGPAF', async () => {
        sessionStorage.setItem('dmi_carteirinha_cpf', '12345678900');

        // Simulando retorno da Edge Function avisando que o cliente não foi encontrado
        vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
            data: { existe: false, msg: "Cadastro não encontrado no sistema principal." },
            error: null
        } as any);

        render(
            <MemoryRouter>
                <Carteirinha />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Ops!')).toBeInTheDocument();
            expect(screen.getByText('Cadastro não encontrado no sistema principal.')).toBeInTheDocument();
        });
    });
});