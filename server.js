/**
 * 百花同行 (BHTX) - 云服务器端
 *前端）
 * 版本：V1.2（兼容 V1.1 / V1.0 老前端）
 *
 * 更新日志：
 * - V1.2: 新增自定义地点/备注、腾讯文本审查接口
 * - V1.1: 新增即刻出发模式、防爬虫机制
 * - V1.0: 基础预约同行功能
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;
const MONGO_URI = "mongodb://localhost:27017/bhtx";
const APP_ID = "wx09391efa82a43eaa";
const APP_SECRET = process.env.WX_APP_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

if (!APP_SECRET) console.error("[ERROR] 缺少环境变量 WX_APP_SECRET，微信 access_token 将无法获取，请配置 .env 文件");
if (!JWT_SECRET) console.error("[ERROR] 缺少环境变量 JWT_SECRET，登录鉴权将失效（可用 `openssl rand -hex 32` 生成），请配置 .env 文件");

app.use(cors());
app.use(express.json());

const sendCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "发送过于频繁，请 15 分钟后再试" }
});

const publishLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "发布过于频繁，请 10 分钟后再试" }
});

const textReviewLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "审查请求过于频繁" }
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "缺少或无效的 Authorization 头" });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: "Token 不能为空" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.openid) {
      return res.status(401).json({ message: "Token 无效：缺少用户标识" });
    }
    req.user = { openid: payload.openid };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token 无效或已过期" });
  }
}

async function requireVerified(req, res, next) {
  try {
    const user = await mongoose.model("User").findOne({ openid: req.user.openid });
    if (!user || !user.isVerified) {
      return res.status(403).json({ message: "为保证校友安全，请先完成北化邮箱认证" });
    }
    next();
  } catch (err) {
    return res.status(500).json({ message: "服务器错误" });
  }
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected:", MONGO_URI))
  .catch((err) => console.error("MongoDB connection error:", err));

// ===== 微信内容安全审查 =====

const textReviewCache = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000;

function getCacheKey(text) {
  return crypto.createHash("md5").update(text).digest("hex");
}

function getCachedReview(text) {
  const key = getCacheKey(text);
  const entry = textReviewCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.result;
  }
  textReviewCache.delete(key);
  return null;
}

function setCachedReview(text, result) {
  const key = getCacheKey(text);
  textReviewCache.set(key, { result, ts: Date.now() });
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of textReviewCache) {
    if (now - entry.ts >= CACHE_TTL) {
      textReviewCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

let _accessToken = null;
let _tokenExpireAt = 0;

async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpireAt) {
    return _accessToken;
  }

  try {
    const res = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`
    );

    if (res.data.access_token) {
      _accessToken = res.data.access_token;
      _tokenExpireAt = Date.now() + (res.data.expires_in - 300) * 1000;
      return _accessToken;
    }

    console.error("[文本审查] 获取access_token失败:", JSON.stringify(res.data));
    return null;
  } catch (err) {
    console.error("[文本审查] 获取access_token异常:", err.message);
    return null;
  }
}

async function wechatTextReview(text, openid) {
  const cached = getCachedReview(text);
  if (cached) return cached;

  const token = await getAccessToken();
  if (!token) {
    console.warn("[文本审查] 无access_token，跳过审查");
    return { suggestion: "Pass", label: "Skipped" };
  }

  try {
    const res = await axios.post(
      `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`,
      {
        content: text,
        version: 2,
        scene: 2,
        openid: openid || "default"
      }
    );

    const data = res.data;

    if (data.errcode !== 0) {
      console.error("[文本审查] 微信返回错误:", JSON.stringify(data));
      return { suggestion: "Pass", label: "ApiError" };
    }

    const result = data.result;
    const suggest = result.suggest || "pass";
    const label = result.label || "Unknown";

    const reviewResult = {
      suggestion: suggest === "pass" ? "Pass" : suggest === "risky" ? "Block" : "Review",
      label: label
    };

    setCachedReview(text, reviewResult);
    return reviewResult;
  } catch (err) {
    console.error("[文本审查] 微信调用失败:", err.message);
    return { suggestion: "Pass", label: "ApiError" };
  }
}

// ===== 数据模型 =====

const tripSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  contact: { type: String, required: true },
  openid: { type: String, required: true },
  status: { type: String, default: "active" },
  nickname: { type: String, default: "北化校友" },
  avatar: { type: String, default: "" },
  tripType: {
    type: String,
    enum: ["scheduled", "immediate"],
    default: "scheduled"
  },
  remark: { type: String, default: "" }
}, { timestamps: true });

const authSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

const Trip = mongoose.model("Trip", tripSchema);
const Auth = mongoose.model("Auth", authSchema);

const userSchema = new mongoose.Schema({
  openid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string", $ne: "" } } }
);

const User = mongoose.model("User", userSchema);

const contactCopySchema = new mongoose.Schema({
  openid: { type: String, required: true },
  tripId: { type: String, required: true },
  copiedAt: { type: Date, default: Date.now }
});

contactCopySchema.index({ openid: 1, copiedAt: 1 }, { expireAfterSeconds: 7200 });

const ContactCopy = mongoose.model("ContactCopy", contactCopySchema);

const copyStatSchema = new mongoose.Schema({
  date: { type: String, required: true },
  count: { type: Number, default: 0 }
});

copyStatSchema.index({ date: 1 }, { unique: true });

const CopyStat = mongoose.model("CopyStat", copyStatSchema);

// ===== 自动过期定时任务 =====
function buildTripDateTime(trip) {
  if (!trip.date || !trip.time) return null;
  const dt = new Date(`${trip.date}T${trip.time}:00+08:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

async function expireOverdueTrips() {
  try {
    const now = new Date();
    const activeTrips = await Trip.find({ status: "active" });
    const expiredIds = [];

    for (const trip of activeTrips) {
      const departureTime = buildTripDateTime(trip);
      if (departureTime && departureTime <= now) {
        expiredIds.push(trip._id);
      }
    }

    if (expiredIds.length > 0) {
      await Trip.updateMany(
        { _id: { $in: expiredIds } },
        { $set: { status: "expired" } }
      );
      console.log(`[过期扫描] ${now.toISOString()} - 已自动过期 ${expiredIds.length} 条行程`);
    }
  } catch (err) {
    console.error("[过期扫描] 执行失败:", err.message);
  }
}

setInterval(expireOverdueTrips, 60 * 1000);
setTimeout(expireOverdueTrips, 5000);

// ===== SMTP 配置 =====
const transporter = nodemailer.createTransport({
  host: "smtp.163.com",
  port: 465,
  secure: true,
    auth: {
      user: process.env.SMTP_USER || "bhtxadmin@163.com",
      pass: process.env.SMTP_PASS
    }
});

if (!process.env.SMTP_PASS) console.error("[ERROR] 缺少环境变量 SMTP_PASS，验证码邮件将无法发送，请配置 .env 文件");

// ===== API =====

// 文本审查接口
app.post("/api/text-review", textReviewLimiter, verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ message: "缺少文本内容" });
    }
    if (text.length > 50) {
      return res.status(400).json({ message: "文本过长" });
    }

    const result = await wechatTextReview(text, req.user.openid);
    res.json({ suggestion: result.suggestion, label: result.label });
  } catch (err) {
    console.error("[文本审查] 接口错误:", err.message);
    res.status(500).json({ message: "内容审核失败" });
  }
});

// 1) 发布行程 (支持预约同行和即刻出发，支持自定义地点和备注)
app.post("/api/trips", publishLimiter, verifyToken, requireVerified, async (req, res) => {
  try {
    const { from, to, date, time, contact, tripType, remark } = req.body;
    const openid = req.user.openid;

    if (!from || !to || !date || !time || !contact) {
      return res.status(400).json({ message: "缺少必要字段" });
    }

    const departureDT = buildTripDateTime({ date, time });
    if (!departureDT || departureDT <= new Date()) {
      return res.status(400).json({ message: "出发时间必须晚于当前时间" });
    }

    const finalTripType = tripType || "scheduled";

    const textsToReview = [];
    if (remark && remark.trim()) textsToReview.push(remark.trim());
    if (from) textsToReview.push(from);
    if (to) textsToReview.push(to);

    for (const text of textsToReview) {
      const reviewResult = await wechatTextReview(text, openid);
      if (reviewResult.suggestion !== "Pass") {
        return res.status(400).json({ message: "输入内容包含违规信息，请修改" });
      }
    }

    const trip = await Trip.create({
      from, to, date, time, contact,
      openid,
      nickname: "北化校友",
      avatar: "",
      status: "active",
      tripType: finalTripType,
      remark: (finalTripType === "scheduled" && remark && remark.trim()) ? remark.trim() : ""
    });

    res.json({ message: "发布成功", trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "发布失败" });
  }
});

app.get("/api/trips/my", verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid;
    if (!openid) return res.status(400).json({ message: "缺少身份凭证" });

    const myTrips = await Trip.find({ openid }).sort({ createdAt: -1 });
    res.json(myTrips);
  } catch (err) {
    console.error("获取我的行程失败:", err);
    res.status(500).json({ message: "服务器内部错误" });
  }
});

app.get('/api/trips', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

    const trips = await Trip.find({ status: "active" })
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(limit);

    const safeTrips = trips.map((trip) => {
      const data = trip.toObject();
      delete data.contact;
      delete data.openid;
      return data;
    });
    res.json(safeTrips);
  } catch (err) {
    console.error('获取列表失败:', err);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

app.get('/api/trips/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: '无效的行程ID' });
    }

    const trip = await Trip.findById(req.params.id).select("-contact");
    if (!trip) {
      return res.status(404).json({ message: '找不到该行程' });
    }

    if (trip.status === 'active') {
      const departureTime = buildTripDateTime(trip);
      if (departureTime && departureTime <= new Date()) {
        trip.status = 'expired';
        await trip.save();
      }
    }

    res.json(trip);
  } catch (err) {
    res.status(500).json({ message: '服务器错误' });
  }
});

app.get("/api/trips/:id/contact", verifyToken, requireVerified, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id).select("contact");
    if (!trip) {
      return res.status(404).json({ message: "找不到该行程" });
    }

    const openid = req.user.openid;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const copyCount = await ContactCopy.countDocuments({
      openid,
      copiedAt: { $gte: twoHoursAgo }
    });

    if (copyCount >= 5) {
      return res.status(429).json({ message: "操作过于频繁，2小时内最多可复制5次联系方式" });
    }

    await ContactCopy.create({ openid, tripId: req.params.id });

    const today = new Date().toISOString().split("T")[0];
    await CopyStat.findOneAndUpdate(
      { date: today },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );

    res.json({ contact: trip.contact, remaining: 5 - copyCount - 1 });
  } catch (err) {
    console.error("获取联系方式失败:", err);
    res.status(500).json({ message: "服务器错误" });
  }
});

app.put("/api/trips/:id/inactive", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "无效的行程ID" });
    }

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: "行程不存在" });
    }

    if (trip.openid !== req.user.openid) {
      return res.status(403).json({ message: "无权下架他人行程" });
    }

    trip.status = "expired";
    await trip.save();

    res.json({ message: "已下架", trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "服务器错误" });
  }
});

app.post("/api/auth/send-code", sendCodeLimiter, async (req, res) => {
  try {
    const { emailPrefix } = req.body;
    if (!emailPrefix) {
      return res.status(400).json({ message: "请提供邮箱前缀" });
    }

    const email = `${emailPrefix}@buct.edu.cn`;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Auth.findOneAndUpdate(
      { email },
      { code, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await transporter.sendMail({
      from: `"BHTX 验证服务" <bhtxadmin@163.com>`,
      to: email,
      subject: "BHTX 登录验证码",
      text: `您的验证码是：${code}，5分钟内有效。`
    });

    res.json({ message: "验证码已发送", email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "验证码发送失败，请检查 SMTP 配置" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: "缺少code" });

  try {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`;
    const response = await axios.get(url);
    const { openid, errcode, errmsg } = response.data;

    if (errcode) return res.status(400).json({ message: errmsg });

    const token = jwt.sign({ openid }, JWT_SECRET, { expiresIn: "7d" });

    const user = await User.findOne({ openid });

    if (user) {
      res.json({ token, isVerified: user.isVerified, email: user.email });
    } else {
      res.json({ token, isVerified: false });
    }
  } catch (err) {
    res.status(500).json({ message: "登录失败" });
  }
});

app.post("/api/auth/verify", verifyToken, async (req, res) => {
  const { emailPrefix, code } = req.body;
  const email = `${emailPrefix}@buct.edu.cn`;
  const openid = req.user.openid;

  try {
    const authRecord = await Auth.findOne({ email, code: String(code), expiresAt: { $gt: new Date() } });
    if (!authRecord) return res.status(400).json({ message: "验证码错误或已过期" });

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.openid !== openid) {
      return res.status(400).json({ message: "该邮箱已被其他微信绑定！" });
    }

    await User.findOneAndUpdate(
      { openid },
      { email, isVerified: true },
      { upsert: true, new: true }
    );
    await Auth.deleteMany({ email });
    res.json({ message: "认证成功", isVerified: true, email });
  } catch (err) {
    res.status(500).json({ message: "认证失败" });
  }
});

app.post("/api/auth/unbind", verifyToken, async (req, res) => {
  const { openid } = req.user;

  try {
    await User.findOneAndUpdate(
      { openid },
      { isVerified: false, email: "" }
    );
    res.json({ message: "解绑成功" });
  } catch (err) {
    res.status(500).json({ message: "解绑失败" });
  }
});

app.get("/api/stats/copy", async (req, res) => {
  const adminKey = req.headers["x-admin-key"] || req.query.key;
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ message: "无权访问" });
  }

  try {
    const days = Math.min(parseInt(req.query.days, 10) || 7, 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    const startDateStr = startDate.toISOString().split("T")[0];

    const stats = await CopyStat.find({ date: { $gte: startDateStr } }).sort({ date: -1 });

    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const stat = stats.find((s) => s.date === dateStr);
      result.push({ date: dateStr, count: stat ? stat.count : 0 });
    }

    res.json({ days, stats: result });
  } catch (err) {
    console.error("获取复制统计失败:", err);
    res.status(500).json({ message: "服务器错误" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
