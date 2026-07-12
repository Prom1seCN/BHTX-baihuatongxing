# 百花同行 (BHTX)

> 北京化工大学（北化）学子专属的拼车 / 同行出行互助平台 —— 纯公益、非营利微信小程序。
>
> AppID：`wx09391efa82a43eaa` · 后端接口：`https://bhtx.prom1se.cn/api`

---

## 一、这是什么

百花同行是一个帮助北化学子拼车、约伴出行的微信小程序。用户发布自己的行程（出发地、目的地、时间），其他人浏览并联系同行。

- 发布行程需通过**北化邮箱（`@buct.edu.cn`）验证码认证**，确保参与者是真实校友。
- 联系方式默认脱敏，认证用户才能复制，且复制有频率限制。
- 文本内容经微信内容安全接口审查，防止违规信息。

---

## 二、技术栈

| 层 | 技术 |
|---|---|
| 前端 | 微信小程序原生（WXML / WXSS / JS），自定义 tabBar |
| 后端 | Node.js + Express + MongoDB（Mongoose） |
| 鉴权 | 微信 `jscode2session` 换 openid + JWT（7 天）；北化邮箱验证码 |
| 安全 | 微信 `msg_sec_check` 文本审查、列表脱敏、联系方式复制限频、各接口 rate-limit |
| 邮件 | Nodemailer 走 163 SMTP 发送验证码 |
| 部署 | Ubuntu 云服务器 + pm2 进程管理（Node 20+） |

---

## 三、目录结构

```
BHTX/
├── app.js / app.json / app.wxss      # 小程序全局配置
├── pages/                           # 8 个页面
│   ├── index/       同行大厅（浏览/筛选行程）
│   ├── detail/      行程详情（认证后复制联系方式）
│   ├── mytrips/     我的行程（查看/下架）
│   ├── publish/     发布行程（即刻出发 / 预约同行）
│   ├── auth/        北化邮箱验证码认证
│   ├── mine/        个人中心
│   ├── legal/       法律声明
│   └── about/       关于项目
├── custom-tab-bar/                  # 自定义底部导航（同行大厅 / 个人中心）
├── utils/
│   ├── request.js      封装 wx.request + JWT + 401 静默重登
│   ├── locations.js    统一地点库（改地点只动这里）
│   ├── trip-formatter.js
│   └── trip-store.js
├── server.js                        # 后端服务（Express）
├── ecosystem.config.js              # pm2 启动配置（不含密钥）
├── package.json                     # 后端依赖与启动脚本
├── .env.example                     # 环境变量模板（提交到仓库）
├── .gitignore                       # 忽略 .env / node_modules 等
└── README.md
```

> ⚠️ **密钥文件 `.env` 不在此目录列表中** —— 它已被 `.gitignore` 忽略，只存在于你的本地与服务器，不会进入 Git 仓库。

---

## 四、环境变量（重要）

所有敏感配置都通过环境变量注入，**绝不写进源码**。

1. 复制模板生成本地配置：
   ```bash
   cp .env.example .env
   ```
2. 用记事本（或任意编辑器）打开 `.env`，填入真实值：

   | 变量 | 说明 |
   |---|---|
   | `WX_APP_SECRET` | 微信小程序 AppSecret（公众平台「开发管理 → 开发设置」获取） |
   | `JWT_SECRET` | JWT 签名密钥。用 `openssl rand -hex 32` 生成一个强随机串 |
   | `SMTP_USER` | 163 邮箱账号（用于发验证码） |
   | `SMTP_PASS` | 163 邮箱授权码（不是登录密码，是「授权码」） |
   | `ADMIN_KEY` | 复制统计接口的管理密钥，自定义任意字符串 |

`.env` 内容示例（仅结构，填入你自己的值）：
```
WX_APP_SECRET=你的微信AppSecret
JWT_SECRET=一串随机字符
SMTP_USER=bhtxadmin@163.com
SMTP_PASS=你的163授权码
ADMIN_KEY=自定义管理密钥
```

---

## 五、本地开发

### 后端
```bash
npm install
npm start        # 等价于 node --env-file=.env server.js，监听 3000 端口
```

### 前端
用**微信开发者工具**打开本项目根目录，即可预览小程序。前端已发布的版本与后端解耦，后端配置变更通常无需重新发布前端。

---

## 六、部署到服务器（pm2）

适用于已将安全加固版部署上线的生产环境（Ubuntu + pm2 + Node 20）。

1. **把改动的文件传到服务器**（在本地 Git Bash 执行，走 SSH）：
   ```bash
   scp server.js ecosystem.config.js .env.example ubuntu@你的服务器IP:/home/ubuntu/bhtx-backend/
   ```
   > `.env` 同样用 scp 传一次即可，之后不用每次传（它不进 Git）。

2. **在服务器上用新配置重启**：
   ```bash
   cd ~/bhtx-backend
   pm2 delete bhtx
   pm2 start ecosystem.config.js
   pm2 save        # 让进程在服务器重启后自动恢复
   ```

3. **验证日志无报错**：
   ```bash
   pm2 logs bhtx --lines 30
   ```
   应看到 `Server running at http://localhost:3000` 与 `MongoDB connected`，且无「缺少环境变量」错误。

> 回滚：若新版本起不来，`cp server.js.save server.js && pm2 delete bhtx && pm2 start server.js` 即可恢复旧版。

---

## 七、安全说明

- 源码中**不包含任何明文密钥**；密钥全部在 `.env`，已加入 `.gitignore`。
- 推送前请确认 `git status` 中**没有 `.env`**。
- 仓库建议设为 **Private**（GitHub → Settings → Change visibility），除非你明确要开源。
- 推送认证使用 **Personal Access Token（PAT）**，不要用登录密码。
- 本项目当前已部署上线，修改后端后按「第六节」流程同步即可，前端无需重新发布。

---

## 八、相关文件速查

- 改地点（校区 / 车站 / 机场）：`utils/locations.js`
- 改后端接口 / 安全策略：`server.js`
- 改进程启动方式：`ecosystem.config.js`
- 改环境变量清单：`.env.example`
