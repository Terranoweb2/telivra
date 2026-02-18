module.exports = {
  apps: [{
    name: 't-delivery',
    script: 'node_modules/.bin/tsx',
    args: 'server.ts',
    cwd: '/root/t-delivery',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    max_memory_restart: '500M',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/root/t-delivery/logs/error.log',
    out_file: '/root/t-delivery/logs/out.log'
  }]
}
