module.exports = {
  apps: [{
    name: 'ctb-code',
    script: 'src/node-entry.ts',
    interpreter: 'tsx',
    cwd: '/path/to/claude-telegram-bot',
    env: {
      TELEGRAM_BOT_TOKEN: 'your-telegram-bot-token',
      TELEGRAM_ALLOWED_USERS: 'your-telegram-user-id',
      OPENAI_API_KEY: 'your-openai-api-key',
      CLAUDE_WORKING_DIR: '/path/to/your/working/dir',
    },
    // Auto-restart settings
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 1000,
    // Log settings
    error_file: '/tmp/ctb-code-error.log',
    out_file: '/tmp/ctb-code-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    // Memory limit (restart if exceeded)
    max_memory_restart: '500M',
  }]
};
