const request = require('../../utils/request')

Page({
  data: {
    emailPrefix: '',
    code: '',
    countingDown: false,
    countdown: 60,
    submitting: false,
    isVerified: false,
    userEmail: ''
  },

  onShow() {
    this.syncAuthStatus()
  },

  onUnload() {
    this.clearCountdownTimer()
  },

  syncAuthStatus() {
    this.setData({
      isVerified: !!wx.getStorageSync('isVerified'),
      userEmail: wx.getStorageSync('userEmail') || ''
    })
  },

  handleEmailInput(e) {
    this.setData({
      emailPrefix: (e.detail.value || '').trim()
    })
  },

  handleCodeInput(e) {
    this.setData({
      code: (e.detail.value || '').trim()
    })
  },

  handleSendCode() {
    if (this.data.countingDown || this.data.isVerified) return
    const emailPrefix = this.validateEmailPrefix()
    if (!emailPrefix) return

    wx.showLoading({
      title: '发送中',
      mask: true
    })

    request({
      url: '/auth/send-code',
      method: 'POST',
      data: { emailPrefix },
      needAuth: false
    })
      .then((data) => {
        wx.hideLoading()
        if (!this.isRequestSuccess({ statusCode: 200, data })) {
          this.showRequestError({ data }, '发送失败，请稍后重试')
          return
        }
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        })
        setTimeout(() => {
          wx.showToast({
            title: '可以在企业微信-工作台-电子邮件查看验证码',
            icon: 'none',
            duration: 3000
          })
        }, 1500)
        this.startCountdown()
      })
      .catch((err) => {
        wx.hideLoading()
        this.showRequestError(err, '网络异常，请稍后重试')
      })
  },

  handleSubmitAuth() {
    if (this.data.submitting || this.data.isVerified) return
    const emailPrefix = this.validateEmailPrefix()
    if (!emailPrefix) return

    const code = (this.data.code || '').trim()
    if (!code) {
      wx.showToast({
        title: '请输入验证码',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({
      title: '认证中',
      mask: true
    })

    request({
      url: '/auth/verify',
      method: 'POST',
      data: { emailPrefix, code },
      needAuth: true // ✅ 强制带上 Token！
    })
      .then((data) => {
        wx.hideLoading()
        this.setData({ submitting: false })
        if (!this.isRequestSuccess({ statusCode: 200, data })) {
          this.showRequestError({ data }, '认证失败，请检查验证码')
          return
        }

        wx.setStorageSync('isVerified', true)
        wx.setStorageSync('userEmail', `${emailPrefix}@buct.edu.cn`)

        wx.showToast({
          title: '认证成功',
          icon: 'success'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 500)
      })
      .catch((err) => {
        wx.hideLoading()
        this.setData({ submitting: false })
        this.showRequestError(err, '网络异常，请稍后重试')
      })
  },

  handleUnbind() {
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.showToast({
        title: '身份信息缺失，请重新登录',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认解除绑定',
      content: '解除后将无法发布与查看联系方式，是否继续？',
      confirmText: '确认解绑',
      success: ({ confirm }) => {
        if (!confirm) return
        this.requestUnbind()
      }
    })
  },

  requestUnbind() {
    wx.showLoading({
      title: '解绑中',
      mask: true
    })

    request({
      url: '/auth/unbind',
      method: 'POST'
    })
      .then((data) => {
        wx.hideLoading()
        if (!this.isRequestSuccess({ statusCode: 200, data })) {
          this.showRequestError({ data }, '解绑失败，请稍后重试')
          return
        }

        wx.removeStorageSync('isVerified')
        wx.removeStorageSync('userEmail')
        this.clearCountdownTimer()
        this.setData({
          emailPrefix: '',
          code: '',
          countingDown: false,
          countdown: 60
        })
        this.syncAuthStatus()
        wx.showToast({
          title: '已解除绑定',
          icon: 'success'
        })
      })
      .catch((err) => {
        wx.hideLoading()
        this.showRequestError(err, '网络异常，请稍后重试')
      })
  },

  validateEmailPrefix() {
    const emailPrefix = (this.data.emailPrefix || '').trim()
    if (!emailPrefix) {
      wx.showToast({
        title: '请先填写学号前缀',
        icon: 'none'
      })
      return ''
    }
    return emailPrefix
  },

  isRequestSuccess(res) {
    if (!res || res.statusCode < 200 || res.statusCode >= 300) return false
    const responseData = res.data
    if (!responseData || typeof responseData !== 'object') return true
    if (responseData.success === false) return false
    if (responseData.ok === false) return false
    return true
  },

  showRequestError(res, fallbackTitle) {
    const responseData = res ? res.data : null
    const title =
      (responseData && (responseData.message || responseData.msg || responseData.error)) || fallbackTitle
    wx.showToast({
      title: String(title).slice(0, 20),
      icon: 'none'
    })
  },

  startCountdown() {
    this.clearCountdownTimer()
    this.setData({
      countingDown: true,
      countdown: 60
    })

    this.countdownTimer = setInterval(() => {
      const nextValue = this.data.countdown - 1
      if (nextValue <= 0) {
        this.clearCountdownTimer()
        this.setData({
          countingDown: false,
          countdown: 60
        })
        return
      }

      this.setData({
        countdown: nextValue
      })
    }, 1000)
  },

  clearCountdownTimer() {
    if (!this.countdownTimer) return
    clearInterval(this.countdownTimer)
    this.countdownTimer = null
  }
})
