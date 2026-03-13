# 🏥 Sistema de Gestão - Cartão DMI

> Plataforma completa para pré-cadastro, gestão de beneficiários, assinatura digital de contratos e controle financeiro de adesões do Cartão DMI.

![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6)
![Supabase](https://img.shields.io/badge/Backend-Supabase-green)
![PWA](https://img.shields.io/badge/App-PWA%20Ready-purple)

## 📖 Sobre o Projeto

O sistema moderniza o processo de adesão ao Cartão de Benefícios DMI. Ele elimina o uso de papel na etapa de contratação, permitindo que o cliente realize todo o processo pelo celular, incluindo o envio de documentos (com compressão automática) e assinatura digital.

Para a administração, oferece um dashboard centralizado para conferência de dados, validação de pagamentos e emissão automática do contrato final em PDF.

---

## 🚀 Funcionalidades Principais

### 👤 Área do Beneficiário (Pública)
1.  **Wizard de Cadastro**: Fluxo passo-a-passo intuitivo para coleta de dados.
2.  **Gestão de Dependentes**: Adição dinâmica de familiares ao plano.
3.  **Upload Inteligente**: Compressão de imagens (RG, Comprovante) no navegador antes do envio, economizando dados e storage.
4.  **Assinatura Digital**: Captura da assinatura manuscrita via `canvas`.
5.  **Pagamento Integrado**: 
    *   Integração com Link de Pagamento Stone.
    *   Suporte a envio de comprovante PIX.
6.  **Protocolo de Atendimento**: Geração de número único para acompanhamento.
7.  **Consulta de Status**: Área para o cliente verificar se foi aprovado e baixar seu contrato.

### 🛡️ Área Administrativa (Restrita)
1.  **Dashboard em Tempo Real**: Atualização automática de novas solicitações (Supabase Realtime).
2.  **Esteira de Aprovação**:
    *   Visualização da ficha completa e documentos.
    *   Conferência de pagamento.
    *   **Geração Automática de Contrato**: Ao aprovar, o sistema funde os dados do cliente + assinatura coletada + template PDF e gera o documento final com validade jurídica.
3.  **Segurança**: Acesso protegido via autenticação (E-mail/Senha).

---

## 🛠️ Stack Tecnológica

*   **Frontend**: React 18, Vite, TypeScript.
*   **Estilização**: Tailwind CSS, shadcn/ui.
*   **Backend (BaaS)**: Supabase.
    *   **PostgreSQL**: Banco de dados relacional.
    *   **Auth**: Gerenciamento de sessão.
    *   **Storage**: Armazenamento de documentos e fotos.
*   **Libs Chave**:
    *   `pdf-lib`: Manipulação e geração de PDFs no navegador.
    *   `react-signature-canvas`: Coleta de assinatura.
    *   `react-imask`: Máscaras de input (CPF, Telefone).

---

## 📂 Estrutura do Banco de Dados

A aplicação utiliza uma tabela principal `inscricoes` no Supabase Postgres.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | uuid | Identificador único. |
| `protocolo` | text | Número de rastreio (Ex: 202310251234). |
| `status` | text | `pendente` ou `aprovado`. |
| `nome_completo` | text | Nome do titular. |
| `cpf` | text | CPF do titular (chave para pastas no Storage). |
| `valor` | text | Valor calculado da mensalidade (R$). |
| `metodo_pagamento` | text | `online` (Stone), `pix` ou `dinheiro`. |
| `dia_vencimento` | text | Dia escolhido para boleto (5, 10, 15...). |
| `anexo_documento_url` | text | Caminho do **Contrato Final (PDF)** gerado. |
| `assinatura_url` | text | Caminho da imagem da assinatura (PNG). |
| `comprovante_pagamento_url`| text | Caminho do comprovante de adesão. |
| `observacoes` | text/json | Armazena a lista de dependentes (JSON). |

---

## 📦 Estrutura de Storage (Bucket: `documentos`)

Os arquivos são organizados por pastas baseadas no CPF do titular (apenas números) para facilitar a organização e segurança.

```text
documentos/
├── 12345678900/                 # CPF do Titular
│   ├── assinatura.png           # Assinatura coletada no Canvas
│   ├── rg.jpg                   # Foto do RG
│   ├── residencia.jpg           # Comprovante de Residência
│   ├── comprovante_pagamento.jpg # Comprovante da Taxa de Adesão
│   ├── dependente_0_CPF.jpg     # Doc do Dependente 1
│   └── contrato_final.pdf       # Gerado APÓS aprovação do Admin
```

---

## ⚙️ Instalação e Configuração

### Pré-requisitos
*   Node.js 18+
*   Conta no Supabase

### 1. Clonar e Instalar
```bash
git clone https://github.com/seu-usuario/cadastro-cartao-dmi.git
cd cadastro-cartao-dmi
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL=Sua_URL_Do_Supabase
VITE_SUPABASE_ANON_KEY=Sua_Anon_Key_Do_Supabase
```

### 3. Configurar Banco de Dados
Execute o script contido em `migrations.sql` no **SQL Editor** do seu painel Supabase para criar as tabelas, buckets e políticas de segurança (RLS).

### 4. Rodar Localmente
```bash
npm run dev
```
O sistema estará acessível em `http://localhost:5173`.

### 5. Build para Produção
```bash
npm run build
```

---

## 📄 Licença
Todos os direitos reservados à **Rede DMI**.