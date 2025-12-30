export const AppConfigs = {
  appName: 'Enque',
  appDescription: 'Help Desk System',

  // API URLs
  api:
    (process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app') + '/v1',

  // App configuration
  defaultTheme: 'system',

  // Main routes
  routes: {
    home: '/',
    signin: '/signin',
    register: '/register',
    workspace: '/workspace',
    dashboard: '/dashboard',
  },

  // Subdomains - Use environment variables with fallback to .enque.cc
  domain: process.env.NEXT_PUBLIC_APP_DOMAIN || '.enque.cc',
  baseUrl: process.env.NEXT_PUBLIC_APP_BASE_URL || 'app.enque.cc',
};
