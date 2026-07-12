Page({
  data: {
    isVerified: false,
    menus: [
      { key: 'mytrips', label: '我的行程' },
      { key: 'auth', label: '邮箱认证' },
      { key: 'feedback', label: '意见反馈' },
      { key: 'legal', label: '隐私政策与用户协议' },
      { key: 'about', label: '关于' }
    ]
  },

  onShow() {
    this.syncTabBar('mine')
    this.syncVerifyStatus()
  },

  handleMenuTap(e) {
    const { key } = e.currentTarget.dataset
    if (key === 'mytrips') {
      wx.navigateTo({
        url: '/pages/mytrips/mytrips'
      })
      return
    }
    if (key === 'legal') {
      wx.navigateTo({
        url: '/pages/legal/legal'
      })
      return
    }
    if (key === 'auth') {
      wx.navigateTo({
        url: '/pages/auth/auth'
      })
      return
    }
    if (key === 'about') {
      wx.navigateTo({
        url: '/pages/about/about'
      })
      return
    }

    const title = '敬请期待'
    wx.showToast({
      title,
      icon: 'none'
    })
  },

  syncTabBar(tab) {
    if (typeof this.getTabBar !== 'function') return
    const tabBar = this.getTabBar()
    if (!tabBar || typeof tabBar.setActiveTab !== 'function') return
    tabBar.setActiveTab(tab)
  },

  syncVerifyStatus() {
    const isVerified = !!wx.getStorageSync('isVerified')
    this.setData({ isVerified })
  }
})
