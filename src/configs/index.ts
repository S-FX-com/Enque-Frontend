export const AppConfigs = {
  appName: 'Enque',
  appDescription: 'Help Desk System',

  // API URLs
  api:
    (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000') + '/v1',

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

  // Subdomains
  domain: '.enque.cc',
  baseUrl: 'app.enque.cc',
};
