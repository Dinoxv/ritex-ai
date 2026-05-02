module.exports = {
  apps: [
  {
    name: 'hyperscalper-bot-engine',
    cwd: '/root/hyperscalper',
    script: 'node_modules/.bin/tsx',
    args: 'lib/bot-engine/index.ts',
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
      BOT_DB_PATH: './data/bot.db',
    },
  },
  {
    name: 'hyperscalper-frontend',
    cwd: '/root/hyperscalper',
    script: 'node_modules/.bin/next',
    args: 'start -p 3001',
    node_args: '--max-old-space-size=512',
    max_memory_restart: '500M',
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      NEXT_DEPLOYMENT_ID: process.env.NEXT_DEPLOYMENT_ID || '',
      BINANCE_WHITELIST_IP: '103.200.20.162',
    },
  }],
};
