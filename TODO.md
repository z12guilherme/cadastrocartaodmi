# Roteiro de Desenvolvimento - Área Administrativa (Cartão DMI)

Este documento detalha as tarefas para a criação da área administrativa do sistema de cadastro, utilizando Supabase.

## 1. Configuração do Projeto Supabase

- [x] Criar o projeto na plataforma Supabase.
- [x] Definir o schema da tabela para armazenar os dados dos formulários de cadastro.
- [x] Configurar o Supabase Storage para o upload dos documentos dos usuários.
- [x] Habilitar o Supabase Authentication e configurar o provedor de e-mail e senha.

## 2. Variáveis de Ambiente (.env)

- [x] Atualizar (ou criar) o arquivo `.env` na raiz do projeto com as novas chaves do Supabase:
  ```env
  VITE_SUPABASE_URL=SUA_URL_DO_SUPABASE
  VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY_DO_SUPABASE
  ```

## 3. Desenvolvimento da Área Administrativa (Dashboard)

### 3.1. Autenticação
- [x] Criar a página de login em `/admin/login`.
- [x] Integrar a página de login com o Supabase Auth (e-mail e senha).
- [x] Implementar rotas protegidas para o dashboard, acessíveis apenas por usuários autenticados.

### 3.2. Interface do Dashboard
- [x] Desenvolver a estrutura e o layout principal do dashboard.
- [x] Criar um componente (card/widget) para exibir o número total de inscrições.
- [x] Desenvolver uma tabela ou lista para exibir os dados de todos os usuários cadastrados.

### 3.3. Funcionalidades
- [x] **Contador de Inscrições**:
  - [x] Conectar o widget de contagem à API do Supabase para buscar o número total de registros na tabela.
- [x] **Visualização de Dados**:
  - [x] Implementar a busca e exibição dos dados dos cadastrados na tabela principal.
  - Adicionar paginação ou scroll infinito para lidar com grandes volumes de dados.
- [x] **Ficha do Cadastrado**:
  - [x] Criar una view de detalhe (página ou modal) para exibir todas as informações de um único usuário.
  - [x] Nesta ficha, exibir os documentos enviados pelo usuário.
  - [x] **Otimização**: Implementar uma rotina para comprimir os documentos/imagens antes de exibi-los na ficha, garantindo um carregamento mais rápido.
- [x] **Gerenciamento de Cadastros**:
  - [x] Implementar lógica para aprovar um cadastro (mudar status para 'aprovado').
  - [x] Implementar lógica para reprovar um cadastro (excluir registro).
  - [x] Adicionar abas para filtrar cadastros por status ('Pendentes', 'Aprovados').
- [x] **Regra de Negócio (Valor)**:
  - [x] Implementar cálculo de valor do plano no momento do cadastro (Titular + Dependentes).

## 4. Testes e Validação
- [x] Testar o fluxo completo de autenticação (login/logout).
- [x] Validar se os dados dos cadastrados são exibidos corretamente no dashboard.
- [x] Verificar se a contagem de inscrições está funcionando.
- [x] Corrigir permissões de RLS para Aprovar (Update) e Reprovar (Delete).

## 5. PWA (Progressive Web App)
- [x] Instalar dependência: `npm install vite-plugin-pwa -D`
- [x] Configurar `vite.config.ts` com o plugin PWA.
- [x] Adicionar ícones do PWA na pasta public (`public/android/*.png`).
- [ ] Implementar prompt de atualização de versão (SW).