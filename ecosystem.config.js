module.exports = {
  apps: [{
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
    },
  }],
};
