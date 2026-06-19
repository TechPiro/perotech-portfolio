// PM2 process config — keeps the PeroTech server running and restarts it on
// crash or server reboot.   Start with:  pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'perotech',
      script: 'server.js',
      cwd: './backend',          // dotenv loads backend/.env from here
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
      },
      out_file: '../logs/out.log',
      error_file: '../logs/error.log',
      time: true,
    },
  ],
};
