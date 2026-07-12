// pm2 启动配置（不含任何密钥，可安全提交）
// 用法：在云服务器上 `pm2 start ecosystem.config.js`
// 真实密钥放在同目录的 .env 中（已被 .gitignore 忽略，不会上传）
module.exports = {
  apps: [
    {
      name: "bhtx",
      script: "server.js",
      node_args: "--env-file=.env", // Node 20+ 原生加载 .env
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
