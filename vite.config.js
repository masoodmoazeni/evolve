import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const stamp = new Date();

// شناسهٔ ساخت: هر بیلد نسخه و زمان خودش را دارد و در «دربارهٔ اِوالو» دیده می‌شود
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __BUILD__: JSON.stringify({
      version: pkg.version,
      time: stamp.toISOString(),
      id: stamp.toISOString().replace(/\D/g, '').slice(2, 12),
    }),
  },
  test: { environment: 'node', globals: false },
});
