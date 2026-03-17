import { describe, it, expect } from 'vitest';

describe('Ambiente de Testes', () => {
  it('deve rodar testes matemáticos perfeitamente', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('deve manipular strings corretamente', () => {
    expect('Cartão DMI'.toLowerCase()).toBe('cartão dmi');
  });
});