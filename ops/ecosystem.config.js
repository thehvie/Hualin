module.exports = {
  apps: [
    {
      name: "haulin-ops",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        // The business's timezone. Job/booking times are read as server-local wall-clock
        // time everywhere, so this must match where the business operates (one per
        // deployment). Override with APP_TIMEZONE when starting PM2.
        TZ: process.env.APP_TIMEZONE || "America/New_York",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
    },
  ],
};
