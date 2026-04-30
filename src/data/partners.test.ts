import { describe, it, expect } from 'vitest';
import { partners } from './partners';

describe('Validação de Dados: Parceiros', () => {
    it('deve conter uma lista não vazia de parceiros ativos', () => {
        expect(partners.length).toBeGreaterThan(0);
    });

    it('todos os parceiros devem ter os campos obrigatórios estruturados e válidos', () => {
        partners.forEach(partner => {
            expect(partner.name, `Parceiro sem nome encontrado`).toBeTruthy();
            expect(partner.discount, `Parceiro ${partner.name} sem desconto`).toBeTruthy();
            expect(partner.description, `Parceiro ${partner.name} sem descrição`).toBeTruthy();
            expect(partner.link, `Link inválido no parceiro ${partner.name}`).toContain('http');
        });
    });
});