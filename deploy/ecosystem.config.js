/**
 * PM2 process config — رسا | RASA production.
 * Usage (from the repo root on the server):  pm2 start deploy/ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      name: "rasa",
      cwd: __dirname + "/..",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1, // local-first app; a single instance is enough and keeps memory low
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      out_file: "/var/log/rasa/out.log",
      error_file: "/var/log/rasa/error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
