module.exports = {
  apps: [
    {
      name: "magooos-backend",
      script: "./dist/src/index.js", 
      env: {
        NODE_ENV: "production",
        PORT: 80,
        DATABASE_URL: process.env.DATABASE_URL
      },
      error_file: "/home/ubuntu/.pm2/logs/magooos-backend-error.log",
      out_file: "/home/ubuntu/.pm2/logs/magooos-backend-out.log",
      time: true,
      watch: false,
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "500M",
      restart_delay: 4000,
      autorestart: true
    },
  ],
};
