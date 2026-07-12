const { formatTripList } = require('../../utils/trip-formatter')
const request = require('../../utils/request')

Page({
  data: {
    myTrips: [],
    isLoading: true,
    isVerified: false
  },

  async onShow() {
    this.setData({ isVerified: !!wx.getStorageSync('isVerified') })
    const token = await this.ensureToken()
    if (!token) {
      wx.showToast({ title: '登录状态失效，请重试', icon: 'none' })
      this.setData({ isLoading: false })
      return
    }

    this.fetchMyTrips()
  },

  async ensureToken() {
    const cachedToken = wx.getStorageSync('token')
    if (cachedToken) {
      return cachedToken
    }

    const app = getApp()
    if (!app || typeof app.checkLogin !== 'function') return ''
    const loginData = await app.checkLogin()
    return (loginData && loginData.token) || wx.getStorageSync('token') || ''
  },

  async fetchMyTrips(options = {}) {
    const shouldShowLoading = options.showLoading !== false
    this.setData({ isLoading: true })
    if (shouldShowLoading) {
      wx.showLoading({ title: '加载中...' })
    }

    try {
      const data = await request({
        url: `/trips/my?_t=${Date.now()}`,
        method: 'GET'
      })
      const formattedTrips = formatTripList(data)
      this.setData({ myTrips: formattedTrips })
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '获取行程失败', icon: 'none' })
    } finally {
      if (shouldShowLoading) {
        wx.hideLoading()
      }
      this.setData({ isLoading: false })
    }
  },

  requestDeactivateTrip(id) {
    return request({
      url: `/trips/${id}/inactive`,
      method: 'PUT'
    }).catch((err) => {
      throw new Error((err && err.data && err.data.message) || '下架失败')
    })
  },

  handleDeactivateTrip(e) {
    const { id, status } = e.currentTarget.dataset
    if (!id) return
    if (status !== 'active') {
      wx.showToast({ title: '该行程已失效', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认下架',
      content: '下架后大厅将不再显示该行程，是否继续？',
      confirmText: '确认下架',
      success: async ({ confirm }) => {
        if (!confirm) return
        wx.showLoading({ title: '下架中...' })
        try {
          await this.requestDeactivateTrip(id)
          wx.showToast({ title: '下架成功', icon: 'success' })
          this.fetchMyTrips({ showLoading: false })
        } catch (error) {
          console.error('手动下架失败:', error)
          wx.showToast({ title: '下架失败，请重试', icon: 'none' })
        } finally {
          wx.hideLoading()
        }
      }
    })
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },
})
