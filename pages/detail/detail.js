const { formatTrip, getTripTimestamp } = require('../../utils/trip-formatter')
const request = require('../../utils/request')

Page({
  data: {
    tripId: '',
    trip: null,
    statusText: '',
    statusClassName: '',
    agreementChecked: false,
    isVerified: false
  },

  onLoad(options) {
    this.setData({ isVerified: !!wx.getStorageSync('isVerified') })
    const { id } = options;
    if (!id) return;
    this.setData({ tripId: id })

    wx.showLoading({ title: '加载中...' });

    request({
      url: `/trips/${id}`,
      method: 'GET',
      needAuth: false
    })
      .then((data) => {
        wx.hideLoading()
        const trip = formatTrip(data)

        let isInactive = trip.status === 'expired' || trip.status === 'inactive'
        if (!isInactive && trip.status === 'active') {
          const departureTs = getTripTimestamp(trip)
          if (departureTs && departureTs <= Date.now()) {
            isInactive = true
          }
        }

        const statusText = isInactive ? '已过期' : (trip.tripType === 'immediate' ? '即刻出发' : '预约同行')
        this.setData({
          trip,
          statusText,
          statusClassName: isInactive ? 'inactive' : 'active'
        })
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '行程已过期或不存在', icon: 'none' })
      })
  },

  handleCopyContact() {
    const isVerified = !!wx.getStorageSync('isVerified')
    if (!isVerified) {
      wx.showModal({
        title: '需要认证',
        content: '为保证校友安全，请先进行北化邮箱认证后再查看联系方式',
        confirmText: '去认证',
        success: ({ confirm }) => {
          if (confirm) {
            wx.navigateTo({
              url: '/pages/auth/auth'
            })
          }
        }
      })
      return
    }

    const trip = this.data.trip
    const { agreementChecked } = this.data
    if (!trip || !trip.id) return
    if (!agreementChecked) {
      wx.showToast({
        title: '请先勾选并同意隐私政策与用户协议',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '获取中...' })
    request({
      url: `/trips/${trip.id}/contact`,
      method: 'GET'
    })
      .then((data) => {
        const contact = (data && (data.contact || data.wechat || data.wechatId)) || ''
        if (!contact) {
          wx.showToast({ title: '联系方式暂不可用', icon: 'none' })
          return
        }
        wx.setClipboardData({
          data: contact,
          success: () => {
            wx.showModal({
              title: '复制成功',
              content: '联系方式已复制，请妥善沟通，注意防范交易风险。',
              showCancel: false,
              confirmText: '我知道了'
            })
          }
        })
      })
      .catch((err) => {
        if (err && err.statusCode === 429) {
          wx.showModal({
            title: '操作频繁',
            content: (err && err.data && err.data.message) || '2小时内最多可复制5次联系方式，请稍后再试',
            showCancel: false,
            confirmText: '我知道了'
          })
          return
        }
        wx.showToast({
          title: (err && err.data && err.data.message) || '获取联系方式失败',
          icon: 'none'
        })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  handleAgreementChange(e) {
    const selectedValues = e.detail.value || []
    this.setData({
      agreementChecked: selectedValues.includes('agree')
    })
  },

  handleAgreementLinkTap() {
    wx.navigateTo({
      url: '/pages/legal/legal'
    })
  },

  onShareAppMessage() {
    const { trip } = this.data
    const title = trip
      ? `【同行】${trip.exact_date} ${trip.departure_time} ${trip.departure} -> ${trip.destination}`
      : '百花同行 - 行程详情'

    return {
      title,
      path: `/pages/detail/detail?id=${trip ? trip.id : ''}`
    }
  },

  onShareTimeline() {
    const { trip } = this.data
    const title = trip
      ? `【同行】${trip.exact_date} ${trip.departure_time} ${trip.departure} -> ${trip.destination}`
      : '百花同行 - 行程详情'

    return {
      title,
      query: `id=${trip ? trip.id : ''}`
    }
  }
})
