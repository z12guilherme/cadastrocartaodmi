/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.pdf' {
  const src: string;
  export default src;
}
