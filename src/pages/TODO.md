# Checklist de Integração - Cadastro Cartão DMI

Este documento lista as etapas necessárias para a integração com a API REST (Submissão de Dados e Arquivos).

## 2. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes chaves:

```env
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

- [x] **Assinatura da Diretora**:
  - Adicionar a assinatura pendente da diretora.
- [x] **Assinatura do Cliente**:
  - Trocar a posição da assinatura do cliente.
- [x] **Validação de Assinatura**:
  - Adicionar data, hora e hash de validação dos dados do titular no PDF.