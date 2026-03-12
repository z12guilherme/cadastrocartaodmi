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
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "Cartão DMI",
        short_name: "DMI",
        description: "Sistema de cadastro e emissão de cartões para o DMI",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "android/pwa-48x48.jpg",
            sizes: "48x48",
            type: "image/jpeg",
          },
          {
            src: "android/pwa-72x72.jpg",
            sizes: "72x72",
            type: "image/jpeg",
          },
          {
            src: "android/pwa-96x96.jpg",
            sizes: "96x96",
            type: "image/jpeg",
          },
          {
            src: "android/pwa-144x144.jpg",
            sizes: "144x144",
            type: "image/jpeg",
          },
          {
            src: "android/pwa-192x192.jpg",
            sizes: "192x192",
            type: "image/jpeg",
          },
          {
            src: "android/pwa-512x512.jpg",
            sizes: "512x512",
            type: "image/jpeg",
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
