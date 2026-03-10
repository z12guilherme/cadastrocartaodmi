# Checklist de Integração - Cadastro Cartão DMI

Este documento lista as etapas necessárias para configurar a integração com o Supabase (Upload de Imagens) e a API REST (Submissão de Dados).

## 1. Configuração do Supabase (Antes da Integração)

Como o backend de arquivos será o Supabase, precisamos configurar o projeto e o bucket.

- [ ] **Criar Conta/Projeto no Supabase**:
  - Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
- [ ] **Criar Bucket de Storage**:
  - No menu "Storage", crie um novo bucket chamado `documentos-cadastro`.
  - Defina o bucket como **Public** (para que as URLs geradas sejam acessíveis pela API principal).
- [ ] **Configurar Policies (RLS)**:
  - Adicione uma policy ao bucket para permitir uploads públicos.
  - Exemplo de Policy (INSERT): `bucket_id = 'documentos-cadastro'` (Permitir acesso a `anon`).
- [ ] **Obter Credenciais**:
  - Vá em Project Settings -> API.
  - Copie a `Project URL`.
  - Copie a `anon` public key.

## 2. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes chaves:

```env
VITE_SUPABASE_URL=sua_url_do_supabase_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
VITE_API_BASE_URL=https://api.seusistema.com.br/v1
```

## 3. Integração no Frontend (Durante o Desenvolvimento)

- [ ] **Conectar o Wizard**:
  - No componente `RegistrationWizard` (passo final), chamar a função `submitCadastro` importada de `@/services/api`.
  - Implementar feedback visual (loading/toast de erro).

## 4. Validação e Testes (Depois da Integração)

- [ ] **Teste de Upload**:
  - Preencha o formulário e envie. Verifique no Dashboard do Supabase se as imagens apareceram.
- [ ] **Teste de API**:
  - Verifique se o JSON chegou corretamente no endpoint `VITE_API_BASE_URL`.
  - Dica: Use Webhook.site como `VITE_API_BASE_URL` temporário para validar o formato do JSON enviado.

## 5. Ajustes de Layout e Conteúdo

- [ ] **Assinatura da Diretora**:
  - Adicionar a assinatura pendente da diretora.
- [ ] **Assinatura do Cliente**:
  - Trocar a posição da assinatura do cliente.