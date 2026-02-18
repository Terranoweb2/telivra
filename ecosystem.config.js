module.exports = {
  apps: [{
    name: "terrano-gps",
    script: "node_modules/.bin/tsx",
    args: "server.ts",
    cwd: "/root/terrano-gps",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    max_memory_restart: "500M",
    merge_logs: true,
    instances: 1,
    exec_mode: "fork"
  }]
}
