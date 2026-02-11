module.exports = {
  apps: [{
    name: 'terrano-gps',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/root/terrano-gps',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
