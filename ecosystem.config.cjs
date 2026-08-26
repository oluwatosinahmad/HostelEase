// ==============================================================================
// HOSTEL EASE — PM2 PROCESS MANAGER ECOSYSTEM CONFIGURATION
// ==============================================================================
// Usage on production server:
//   pm2 start ecosystem.config.cjs --env production
//   pm2 save
//   pm2 startup

module.exports = {
  apps: [
    {
      name: 'hostel-ease',
      script: 'server/index.ts',
      interpreter: 'node',
      node_args: '--import tsx',
      instances: 1, // Single instance recommended for SQLite WAL single-writer optimization
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      exp_backoff_restart_delay: 100,

      // Log Management
      out_file: './logs/app-out.log',
      error_file: './logs/app-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true,

      // Environment Overrides
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
