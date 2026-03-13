/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.pdf' {
  const content: string
  export default content
}
