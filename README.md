# 百花同行 · BHTX

> 北京化工大学（BUCT）学子专属的 **纯公益、非营利** 拼车 / 同行互助小程序。

<p align="center">
  <img src="pic.png" alt="百花同行 Logo" width="120" />
</p>

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/Platform-微信小程序-brightgreen" />
  <img alt="Backend" src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933" />
  <img alt="Database" src="https://img.shields.io/badge/Database-MongoDB-47A248" />
  <img alt="Nature" src="https://img.shields.io/badge/Nature-纯公益%20非营利-ff69b4" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue" />
</p>

---

## ✨ 项目简介

**百花同行**是一个面向北京化工大学在校师生的校园出行互助平台。把同一时间、相近路线的同学匹配到一起，共同呼叫正规网约车、分摊车费。

- 🚫 **不提供车辆、不派单、不抽成**
- 🎓 **仅对北化在校生开放** —— 需 `@buct.edu.cn` 教育邮箱认证
- 💚 **全程零商业、纯公益**
- ✅ 项目已上线运营，在微信内搜索「百花同行」小程序即可使用

---

## 🌟 功能特性

| 模块 | 说明 |
| --- | --- |
| **同行大厅** | 按出发地 / 目的地 / 日期（今天 / 明天 / 后天 / 自定义）多维度筛选，分页懒加载。 |
| **发布行程** | 两种模式：<br>• **即刻出发** —— 选择「X 分钟后出发」，适合临时约车；<br>• **预约同行** —— 提前 15 天内预约，支持自定义地点与备注。 |
| **北化邮箱认证** | `@buct.edu.cn` 验证码登录；认证后才可发布行程、查看他人联系方式。 |
| **行程详情** | 查看完整行程信息；复制对方联系方式（限频：2 小时内最多 5 次），需勾选协议。 |
| **我的行程** | 管理自己发布的行程，可一键下架。 |
| **文本安全审查** | 发布时自动调用微信内容安全接口（`msg_sec_check`）过滤违规信息。 |
| **自动过期** | 出发时间一过，行程自动标记为 `expired`，不再对外展示。 |
| **配套页面** | 个人中心 / 关于 / 隐私政策与用户协议。 |

---

## 🏗️ 技术架构

```
┌─────────────────────┐         HTTPS / JSON (JWT Bearer)        ┌─────────────────────────┐
│   微信小程序前端      │  ───────────────────────────────────▶  │     Node.js + Express    │
│  (WXML / WXSS / JS) │  ◀───────────────────────────────────  │       服务端 REST API     │
└─────────────────────┘           生产域名见下                     └────────────┬────────────┘
                                                                              │ Mongoose ODM
                                                                              ▼
                                                                     ┌──────────────────┐
                                                                     │     MongoDB      │
                                                                     │ Trip / User / … │
                                                                     └──────────────────┘
```

- **前端**：原生微信小程序框架（glass-easel），自定义 tabBar（仅「同行大厅」「个人中心」两项）。
- **后端**：Node.js + Express 提供 RESTful API，MongoDB（Mongoose）持久化。
- **生产 API 地址**：`https://bhtx.prom1se.cn/api`

---

## 🛠️ 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | 微信原生小程序、自定义 tabBar 组件 |
| 后端 | Node.js、Express、Mongoose、jsonwebtoken、Nodemailer、axios、express-rate-limit |
| 数据库 | MongoDB |
| 鉴权与安全 | 微信小程序登录（`jscode2session`）、JWT（7 天有效期）、微信内容安全 `msg_sec_check`、接口限流 |
| 部署 | pm2 + `ecosystem.config.js`（Node 20+ 原生 `--env-file` 加载 `.env`） |

---

## 📁 目录结构

```
BHTX/
├── app.js / app.json / app.wxss      # 小程序入口与全局配置
├── server.js                         # 后端服务（Express + MongoDB）
├── package.json                      # 后端依赖与启动脚本
├── ecosystem.config.js               # pm2 部署配置（不含密钥）
├── project.config.json               # 微信开发者工具项目配置
├── pic.png                          # 应用 Logo
├── .env.example                     # 环境变量模板（真实值见 .env，已被 .gitignore 忽略）
├── pages/                           # 8 个页面
│   ├── index/      同行大厅（筛选 / 分页 / 详情入口）
│   ├── detail/     行程详情（复制联系方式）
│   ├── mytrips/    我的行程
│   ├── publish/    发布（即刻出发 / 预约同行）
│   ├── auth/       北化邮箱认证
│   ├── mine/       个人中心
│   ├── about/      关于
│   └── legal/      隐私政策与用户协议
├── custom-tab-bar/                  # 自定义底部导航
└── utils/                          # 公共逻辑
    ├── request.js          请求封装（JWT / 401 静默重登）
    ├── locations.js        统一地点库（增删地点只需改这里）
    ├── trip-formatter.js   行程格式化 / 排序
    └── trip-store.js       本地存储
```

---

## 🚀 本地运行

### 前置条件

- Node.js ≥ 20（需支持 `--env-file`）
- 本地 MongoDB 实例
- 微信开发者工具
- 一个 163 邮箱（用于发送验证码）与微信小程序 AppID

### 1. 启动后端

```bash
git clone <your-repo-url>
cd BHTX

npm install

# 复制环境变量模板并填入真实值
cp .env.example .env
# 编辑 .env：WX_APP_SECRET / JWT_SECRET / SMTP_USER / SMTP_PASS / ADMIN_KEY

npm start          # 等价于 node --env-file=.env server.js
```

服务默认监听 **3000** 端口，MongoDB 默认连接 `mongodb://localhost:27017/bhtx`
（如需修改，编辑 `server.js` 顶部 `MONGO_URI` 常量）。

### 2. 打开前端

1. 用微信开发者工具「导入项目」，目录选择本仓库根目录。
2. AppID 填 `wx09391efa82a43eaa`（或你自己的测试号）。
3. 在「开发管理 → 服务器域名」中将 `https://bhtx.prom1se.cn` 加入 request 合法域名；本地调试可勾选「不校验合法域名」。
4. 编译预览。

---

## 🔐 环境变量

| 变量 | 说明 | 获取方式 |
| --- | --- | --- |
| `WX_APP_SECRET` | 微信小程序 AppSecret | 微信公众平台「开发管理 → 开发设置」 |
| `JWT_SECRET` | JWT 签名密钥 | `openssl rand -hex 32` 生成随机串 |
| `SMTP_USER` | 163 邮箱账号 | 如 `bhtxadmin@163.com` |
| `SMTP_PASS` | 163 邮箱授权码（非登录密码） | 163 邮箱「设置 → 客户端授权码」 |
| `ADMIN_KEY` | 复制统计接口 (`/api/stats/copy`) 的管理密钥 | 自定义任意字符串 |
| `PORT` | 服务端口（默认 3000） | 可选 |
| `MONGO_URI` | MongoDB 连接串（当前于 `server.js` 硬编码，可改） | 可选 |

> ⚠️ 密钥仅存于服务端 `.env`，**绝不入库、不进前端、不写进任何会被提交的文件中**。`.env` 已在 `.gitignore` 中忽略。

---

## 📡 API 概览

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 微信 `code` 换取 JWT | 否 |
| POST | `/api/auth/send-code` | 发送北化邮箱验证码 | 否 |
| POST | `/api/auth/verify` | 校验验证码完成认证 | Token |
| POST | `/api/auth/unbind` | 解绑邮箱 | Token |
| GET | `/api/trips` | 大厅列表（脱敏，支持 `limit` / `skip` 分页） | 否 |
| POST | `/api/trips` | 发布行程 | Token + 已认证 |
| GET | `/api/trips/my` | 我的行程 | Token |
| GET | `/api/trips/:id` | 行程详情（脱敏） | 否 |
| GET | `/api/trips/:id/contact` | 获取联系方式（限频 5 次 / 2 小时） | Token + 已认证 |
| PUT | `/api/trips/:id/inactive` | 下架自己的行程 | Token |
| POST | `/api/text-review` | 文本安全审查 | Token |
| GET | `/api/stats/copy` | 每日复制统计（需 `ADMIN_KEY`） | Admin Key |

---

## 🛡️ 安全与隐私

- **列表脱敏**：大厅与详情接口对所有访客隐藏 `contact` 与 `openid`。
- **联系方式受控**：仅在用户完成北化邮箱认证、且勾选协议后，经限频接口获取。
- **内容审查**：所有发布文本经微信 `msg_sec_check` 内容安全审查，违规即拦截。
- **多层限流**：发布 5 次 / 10 分钟、发码 5 次 / 15 分钟、文本审查 20 次 / 分钟、复制 5 次 / 2 小时。
- **最小数据收集**：仅收集教育邮箱（用于身份校验，不公开）与用户主动填写的行程 / 联系方式（仅行程有效期内展示）。

---

## 🚢 部署（pm2）

服务端使用 pm2 守护进程，`ecosystem.config.js` 已配置好启动参数（不含任何密钥）：

```bash
# 在服务器上
npm install --production
cp .env.example .env   # 填入生产环境真实密钥
pm2 start ecosystem.config.js
pm2 save
```

> 说明：`ecosystem.config.js` 通过 `node_args: "--env-file=.env"` 让 Node 20+ 原生加载 `.env`，无需额外 dotenv 依赖。

---

## ⚖️ 免责声明

百花同行**仅为信息发布与展示工具**，并非道路运输经营者，不提供任何运输服务，亦不从中收取佣金。用户间的费用分摊仅限于打车等直接成本，严禁利用本平台从事非法营运或盈利活动。

平台采用教育邮箱进行基础身份验证，但**无法实时核验用户的真实身份、驾驶资质、车辆保险及安全性能**，请用户在实际接触中自行核实。因线下行程产生的任何事故、纠纷或财产损失，由相关责任方依法承担，本平台在法律允许的最大范围内不承担赔偿责任。

完整条款见小程序内「隐私政策与用户协议」页面。

---

## 👤 作者

由 **PROM1SE** 独立开发与维护。

---

## 📄 开源协议

本项目以 [MIT 协议](./LICENSE) 开源，仅供学习与交流使用。
