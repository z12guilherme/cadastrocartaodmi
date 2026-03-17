import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Limpa o DOM da memória após cada teste para evitar vazamento de dados
afterEach(() => {
  cleanup();
});