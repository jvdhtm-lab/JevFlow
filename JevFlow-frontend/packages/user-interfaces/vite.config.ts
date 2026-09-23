import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [react(), dts({ include: ["lib", "src"] })],
  build: {
    rollupOptions: {
      external: (id) => {
        if (id === '@vhrs/resources' || id.startsWith('@vhrs/resources/')) return true;
        return ['react', 'react/jsx-runtime', '@mui/icons-material', '@mui/material', '@mui/styled-engine-sc'].includes(id);
      },
    },
    lib: {
      entry: resolve(__dirname, "lib/main.ts"),
      formats: ["es"],
    },
  },
});
