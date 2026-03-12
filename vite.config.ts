import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Permite que qualquer host (incluindo os gerados pelo ngrok) acesse o servidor de desenvolvimento.
    // Isso é útil para testes em dispositivos móveis, mas deve ser usado com cautela.
    // Em produção, essa opção não tem efeito.
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      devOptions: {
        enabled: true,
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg", "contrato.pdf"],
      manifest: {
        name: "Cartão DMI",
        id: "/",
        short_name: "DMI",
        start_url: "/",
        scope: "/",
        orientation: "portrait",
        description: "Acesso facilitado a serviços de saúde. Faça seu pré-cadastro para o Cartão DMI e tenha descontos em consultas, exames e procedimentos.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        screenshots: [
          {
            src: "/android/screenshot-wide.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
            label: "Cartão DMI Desktop"
          },
          {
            src: "/android/screenshot-narrow.png",
            sizes: "720x1280",
            type: "image/png",
            form_factor: "narrow",
            label: "Cartão DMI Mobile"
          }
        ],
        icons: [
          {
            src: "/android/pwa-48x48.png",
            sizes: "48x48",
            type: "image/png",
          },
          {
            src: "/android/pwa-72x72.png",
            sizes: "72x72",
            type: "image/png",
          },
          {
            src: "/android/pwa-96x96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "/android/pwa-144x144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/android/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/android/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
