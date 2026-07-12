// app.js

const originalPage = Page
Page = function(config) {
  const originalOnShareAppMessage = config.onShareAppMessage
  config.onShareAppMessage = function(options) {
    if (originalOnShareAppMessage) {
      return originalOnShareAppMessage.call(this, options)
    }
    return {
      title: '百花同行 - 专属北化学子的拼车大厅',
      path: '/pages/index/index'
    }
  }

  const originalOnShareTimeline = config.onShareTimeline
  config.onShareTimeline = function(options) {
    if (originalOnShareTimeline) {
      return originalOnShareTimeline.call(this, options)
    }
    return {
      title: '百花同行 - 专属北化学子的拼车大厅',
      query: ''
    }
  }

  return originalPage(config)
}

App({
  onLaunch() {
    // 1. 展示本地存储能力（保留原有的日志功能）
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 2. 执行静默登录与身份同步
    this.checkLogin()
  },

  // 定义 checkLogin 方法
  checkLogin() {
    return new Promise((resolve) => {
      wx.login({
        success: (res) => {
          if (!res.code) {
            resolve(null)
            return
          }

          wx.request({
            url: 'https://bhtx.prom1se.cn/api/auth/login',
            method: 'POST',
            data: { code: res.code },
            success: (loginRes) => {
              if (loginRes.statusCode !== 200 || !loginRes.data) {
                console.warn('【登录检查】服务器返回异常：', loginRes.statusCode)
                resolve(null)
                return
              }

              const { token, isVerified, email } = loginRes.data
              if (token) wx.setStorageSync('token', token)
              wx.setStorageSync('isVerified', !!isVerified)
              wx.setStorageSync('userEmail', email || '')

              console.log('【登录检查】同步成功，当前身份：', isVerified ? '已认证校友' : '游客')
              resolve(loginRes.data)
            },
            fail: (err) => {
              console.error('【登录检查】请求失败，请检查网络或后端地址：', err)
              resolve(null)
            }
          })
        },
        fail: () => resolve(null)
      })
    })
  },

  globalData: {
    userInfo: null
  }
})
