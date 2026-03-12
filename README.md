# Cadastro Cartão DMI

Sistema de cadastro, emissão de cartões e gestão administrativa para o Cartão DMI.

## Sobre o Projeto

Esta aplicação web permite o cadastro de beneficiários e dependentes, geração de contratos em PDF e gestão administrativa das solicitações. O sistema utiliza **React** no frontend e **Supabase** como backend para autenticação, banco de dados e armazenamento de arquivos.

## Funcionalidades

### 🌟 Área Pública (Beneficiário)
- **Pré-Cadastro Online**: Formulário passo-a-passo (Wizard) para coleta de dados pessoais e dependentes.
- **Upload Otimizado**: Envio de fotos de RG e Comprovante de Residência com compressão automática de imagem (economia de ~90% de espaço).
- **Assinatura Digital**: Captura de assinatura manuscrita diretamente na tela.
- **Geração de Contrato**: Criação automática do contrato em PDF preenchido.
- **Cálculo Automático**: Definição do valor da mensalidade com base no plano (Individual ou Familiar).

### 🔐 Área Administrativa (Restrita)
- **Dashboard em Tempo Real**: Visualização imediata de novas solicitações via Supabase Realtime.
- **Gestão de Solicitações**:
  - Listagem de cadastros pendentes e aprovados.
  - Visualização detalhada da ficha do beneficiário (Dados, Documentos, Dependentes).
  - Ações de **Aprovar** ou **Reprovar** (Excluir) cadastros.
- **Autenticação Segura**: Acesso restrito via E-mail e Senha.
- **PWA (Progressive Web App)**: Aplicativo instalável e com suporte offline.

## Tecnologias Utilizadas

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend (BaaS)**: Supabase (Auth, Postgres Database, Storage, Realtime).
- **Libs**: `pdf-lib` (PDFs), `react-signature-canvas` (Assinatura), `lucide-react` (Ícones).

## Configuração do Ambiente

1. **Clone o repositório** e instale as dependências:
   ```bash
   npm install
   ```

2. **Variáveis de Ambiente**:
   Crie um arquivo `.env` na raiz do projeto com as credenciais do seu projeto Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url
   VITE_SUPABASE_ANON_KEY=sua_chave
   ```

3. **Execute o projeto**:
   ```bash
   npm run dev 
   ```
'-'