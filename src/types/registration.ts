export interface Titular {
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  telefoneCelular: string;
  email: string;
  cep: string;
  cidade: string;
  bairro: string;
  rua: string;
  numero: string;
  pontoReferencia: string;
}

export interface TitularDocumentos {
  fotoRg: string | null;
  fotoCpf: string | null;
  fotoComprovanteResidencia: string | null;
}

export interface Dependente {
  id: string;
  nomeCompleto: string;
  parentesco: string;
  cpf: string;
  fotoDocumento: string | null;
}

export interface RegistrationData {
  titular: Titular;
  documentos: TitularDocumentos;
  dependentes: Dependente[];
}

export const ADESAO = 75.0;
export const MENSALIDADE_INDIVIDUAL = 30.0;
export const MENSALIDADE_POR_VIDA_FAMILIAR = 25.0;
export const MAX_DEPENDENTES = 5;

export function calcularMensalidade(numDependentes: number): number {
  if (numDependentes === 0) return MENSALIDADE_INDIVIDUAL;
  return (1 + numDependentes) * MENSALIDADE_POR_VIDA_FAMILIAR;
}

export function tipoPlano(numDependentes: number): string {
  return numDependentes === 0 ? "Individual" : "Familiar";
}

export const initialTitular: Titular = {
  nomeCompleto: "",
  dataNascimento: "",
  cpf: "",
  telefoneCelular: "",
  email: "",
  cep: "",
  cidade: "",
  bairro: "",
  rua: "",
  numero: "",
  pontoReferencia: "",
};

export const initialDocumentos: TitularDocumentos = {
  fotoRg: null,
  fotoCpf: null,
  fotoComprovanteResidencia: null,
};
