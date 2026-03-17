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
  - [x] Implementar a listagem e exibição dos dados dos cadastrados na tabela principal.
  - [ ] Adicionar paginação ou scroll infinito para lidar com grandes volumes de dados.
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
- [x] Implementar prompt de atualização de versão (SW).

--

## 6. Integração com Telegram (Backup + Autolimpeza de Storage)
A estratégia para nunca estourar o limite de 1GB gratuito do Supabase.
- [x] **Criar Bot**: Falar com o `@BotFather` no Telegram e gerar um Token.
- [x] **Grupo Administrativo**: Criar um grupo privado no Telegram, adicionar o Bot e pegar o `chat_id`.
- [x] **Supabase Edge Function (`backup-telegram`)**: Criar função que escuta a aprovação do cadastro.
- [x] **Upload via API**: A função baixa as imagens/PDF do Supabase e envia para o grupo do Telegram usando a API oficial (`sendDocument` e `sendPhoto`).
- [x] **Limpeza (Exclusão)**: Após o envio com sucesso para o Telegram, a função deleta as imagens pesadas (RG, Comprovantes) do Supabase Storage, mantendo apenas o PDF do contrato.
- [x] **Gatilho (Webhook)**: Criar o Webhook no painel do Supabase para disparar a Edge Function ao atualizar a tabela `inscricoes`.

--

## 7. Integração com Stone (Pagamento Automático via Webhook)
O Roteiro do Webhook (Stone + Supabase Edge Functions)

- [ ] **Painel da Stone**: Acessar a área de "Desenvolvedor" ou "Configurações > Webhooks" na conta da empresa.
- [ ] **Cadastrar a Rota**: Adicionar a URL onde seu sistema vai escutar os eventos (ex: URL da sua Supabase Edge Function). Lembre de marcar para ouvir o evento de "Pagamento Aprovado" (ex: `order.paid`).
- [ ] **Pegar a Chave**: Copiar o `WEBHOOK_SECRET` (chave de assinatura) que a Stone vai gerar para essa URL específica.
- [ ] **Variáveis de Ambiente no Supabase**: Adicionar a chave "Secret" no Supabase (`STONE_WEBHOOK_SECRET`) para que a Edge Function possa validar a autenticidade do evento da Stone.
- [x] **Criar Webhook (Edge Function)**: Criar uma Supabase Edge Function (Deno/Typescript) com a lógica de validação do hash (HMAC) e o update direto no banco usando a `SUPABASE_SERVICE_ROLE_KEY` (mudando status para 'aprovado').
- [x] **Deploy da Função**: Fazer o deploy da função no projeto Supabase (ex: `supabase functions deploy webhook-stone`).
- [ ] **Teste de Fogo**: Fazer um pagamento de teste (ou simular no próprio painel da Stone) e assistir a mágica do status mudando para "Aprovado" sozinho na tabela do Supabase.

--
