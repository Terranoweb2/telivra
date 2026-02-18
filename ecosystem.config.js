module.exports = {
  apps: [{
    name: "terrano-gps",
    script: "server.mjs",
    cwd: "/root/terrano-gps",
    node_args: "--experimental-strip-types",
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
