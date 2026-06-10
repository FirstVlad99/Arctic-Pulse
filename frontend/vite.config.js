export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://directus:8055',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/n8n': {
        target: 'http://n8n:5678',
        changeOrigin: true
      }
    }
  }
}