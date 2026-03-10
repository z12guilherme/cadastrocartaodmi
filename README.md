# Cadastro Cartão DMI

Sistema de cadastro e emissão de cartões para o DMI.

## Sobre o Projeto

Esta aplicação permite o cadastro de membros e a geração automática de cartões de identificação em formato PDF, incluindo a captura de assinatura digital diretamente na interface.

## Tecnologias Utilizadas

O projeto foi desenvolvido com uma stack moderna focada em performance e usabilidade:

- **[Vite](https://vitejs.dev/)**: Build tool e servidor de desenvolvimento.
- **[React](https://reactjs.org/)**: Biblioteca para construção da interface.
- **[TypeScript](https://www.typescriptlang.org/)**: Tipagem estática para maior segurança no código.
- **[Tailwind CSS](https://tailwindcss.com/)**: Estilização rápida e responsiva.
- **[shadcn/ui](https://ui.shadcn.com/)**: Componentes de interface elegantes e acessíveis.
- **[react-signature-canvas](https://github.com/agilgur5/react-signature-canvas)**: Para captura de assinaturas manuscritas.
- **[pdf-lib](https://pdf-lib.js.org/)**: Para geração e manipulação de arquivos PDF no navegador.

## Funcionalidades

- 📝 **Formulário de Cadastro**: Campos para inserção de dados do membro.
- ✍️ **Assinatura Digital**: Canvas interativo para desenhar a assinatura.
- 🖨️ **Geração de PDF**: Criação instantânea do cartão preenchido pronto para impressão ou download.

## Como Executar o Projeto

Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.

1. **Clone o repositório** (se ainda não o fez):
   ```bash
   git clone <URL_DO_SEU_REPOSITORIO>
   cd cadastrocartaodmi
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Rode o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

4. Acesse a aplicação no navegador através do link exibido no terminal (geralmente `http://localhost:8080`).
