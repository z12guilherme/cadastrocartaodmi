# Roteiro de Desenvolvimento - Área Administrativa (Cartão DMI)

Este documento detalha as tarefas para a criação da área administrativa do sistema de cadastro, utilizando Supabase.
--
## 1. Configuração do Projeto Supabase

- [x] Criar o projeto na plataforma Supabase.
- [x] Definir o schema da tabela para armazenar os dados dos formulários de cadastro.
- [x] Configurar o Supabase Storage para o upload dos documentos dos usuários.
- [x] Habilitar o Supabase Authentication e configurar o provedor de e-mail e senha.
--
## 2. Variáveis de Ambiente (.env)

- [x] Atualizar (ou criar) o arquivo `.env` na raiz do projeto com as novas chaves do Supabase:
  ```env
  VITE_SUPABASE_URL=SUA_URL_DO_SUPABASE
  VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY_DO_SUPABASE
  ```
--
## 3. Desenvolvimento da Área Administrativa (Dashboard)

--

### 3.1. Autenticação
- [x] Criar a página de login em `/admin/login`.
- [x] Integrar a página de login com o Supabase Auth (e-mail e senha).
- [x] Implementar rotas protegidas para o dashboard, acessíveis apenas por usuários autenticados.

--

### 3.2. Interface do Dashboard
- [x] Desenvolver a estrutura e o layout principal do dashboard.
- [x] Criar um componente (card/widget) para exibir o número total de inscrições.
- [x] Desenvolver uma tabela ou lista para exibir os dados de todos os usuários cadastrados.

--

### 3.3. Funcionalidades
- [x] **Contador de Inscrições**:
  - [x] Conectar o widget de contagem à API do Supabase para buscar o número total de registros na tabela.
- [x] **Visualização de Dados**:
  - [x] Implementar a listagem e exibição dos dados dos cadastrados na tabela principal.
  - [x] Adicionar paginação ou scroll infinito para lidar com grandes volumes de dados.
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

--

## 4. Testes e Validação
- [x] Testar o fluxo completo de autenticação (login/logout).
- [x] Validar se os dados dos cadastrados são exibidos corretamente no dashboard.
- [x] Verificar se a contagem de inscrições está funcionando.
- [x] Corrigir permissões de RLS para Aprovar (Update) e Reprovar (Delete).

--

## 5. PWA (Progressive Web App)
- [x] Instalar dependência: `npm install vite-plugin-pwa -D`
- [x] Configurar `vite.config.ts` com o plugin PWA.
- [x] Adicionar ícones do PWA na pasta public (`public/android/*.png`).
- [x] Implementar prompt de atualização de versão (SW).

--

## 6. Integração com SIGPAF (Sincronização via API)
Conexão direta com o sistema desktop da clínica para evitar retrabalho manual.
- [x] **Reunião de Alinhamento**: Definir Endpoint, Formato do JSON (Payload) e Autenticação com o dev do SIGPAF.
- [x] **Supabase Edge Function (`sync-sigpaf`)**: Criar/Atualizar função que escuta a aprovação do cadastro.
- [x] **Webhook HTTP**: Função envia um `POST` com os dados mapeados para a rota exposta pelo SIGPAF.
- [x] **Limpeza de Storage (Concluído)**: Imagens pesadas são deletadas do Supabase Storage automaticamente após backup no Telegram, evitando estourar o limite de 1GB.
- [x] **Gatilho (Webhook)**: Disparar a Edge Function no Supabase ao atualizar a tabela `inscricoes` com status `aprovado`.

--

## 7. Experiência do Cliente (UX) e Retenção
- [x] **Auto-save do Formulário (Rascunho Offline)**: Uso do `localStorage` para salvar os dados em tempo real, evitando perda de progresso se a página for fechada.
- [x] **Notificação via WhatsApp (API Suri)**: Disparo automático de dois templates (Aprovação e Carteirinha) assim que o administrador confirma o pagamento.
- [x] **Aviso de Contato via WhatsApp**: Adicionar alerta na tela final do Wizard informando ao cliente que as confirmações e a carteirinha chegarão via WhatsApp.
- [x] **Protocolo Simplificado**: Uso do próprio CPF do cliente como chave de busca, substituindo protocolos aleatórios complexos.
- [x] **Carteirinha Digital PWA**: Tela dinâmica (`/carteirinha/:cpf`) simulando um cartão físico, com status em tempo real e lista de dependentes.

--

## 8. Dashboard e Gestão Financeira
- [x] **MRR (Receita Mensal Recorrente)**: Card no Dashboard que calcula e formata dinamicamente a soma do valor de todas as adesões aprovadas.
- [x] **Acesso Rápido à Carteirinha**: Aba no modal do administrador para copiar ou visualizar o link da carteirinha digital do beneficiário.
- [x] **Gráficos Visuais**: Adicionar gráfico de barras dinâmico (Tailwind) mostrando o crescimento das aprovações nos últimos 7 dias.
- [x] **Exportação de Dados**: Botão para exportar a lista de clientes para Excel/CSV formatada para a contabilidade.

--

## 9. Segurança e Performance
- [x] **Anti-Fraude de CPF**: RPC no banco de dados e validação no frontend/backend para impedir cadastros duplicados simultâneos com o mesmo CPF.
- [x] **Otimização de Banco de Dados**: Dashboard refatorado para carregar os links de arquivos assinados em lote (Batch Request) e uploads paralelos (`Promise.all`).
- [x] **Logout Automático**: Administrador do painel é desconectado automaticamente após 15 minutos de inatividade para evitar acesso indevido.
- [x] **Sanitização Rigorosa do Storage**: Políticas do Supabase (RLS) atualizadas para bloquear uploads e updates de qualquer arquivo que não seja `.jpg`, `.jpeg`, `.png` ou `.pdf`.

--

## 10. Evolução da Carteirinha Digital e Validação
- [x] **QR Code Dinâmico**: Adicionar um QR Code na tela da Carteirinha Digital com o CPF ou código do cliente para agilizar o atendimento presencial (bip na recepção).
- [x] **Status em Tempo Real (SIGPAF)**: Criar função para consultar a API do SIGPAF (`GET /public/Pessoa?cpf=...`) sempre que a carteirinha for aberta.
- [x] **Selo de Autenticidade**: Usar o retorno da API (`pessoaSituacao.psi_descricao`) para exibir um selo de **"ATIVO"** ou **"INATIVO"**, inviabilizando o uso de prints antigos por clientes inadimplentes.

## 11. Correção de Bugs
- [] Corrigir BUG: na consulta está retornando um cliente com o CPF já cancelado
