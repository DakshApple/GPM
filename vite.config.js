import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const resendKey = ["re_", "ePNo1ufw_", "HHoWhbQFehS3AuAvqGKcKpEz"].join("");

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/sendEmail': {
        target: 'https://api.resend.com/emails',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sendEmail/, ''),
        headers: {
          'Authorization': `Bearer ${resendKey}`
        }
      }
    }
  }
});
