Component({
  data: {
    selectedTab: 'hall',
    uiTokens: {
      activeColor: '#2678ff',
      inactiveColor: '#9ca3af',
      publishSize: 88,
      publishOffset: 0,
      publishFontSize: 52
    },
    hallLabelStyle: '',
    mineLabelStyle: '',
    publishStyle: ''
  },

  methods: {
    setActiveTab(tab) {
      const selectedTab = tab === 'mine' ? 'mine' : 'hall'
      if (selectedTab !== this.data.selectedTab) {
        this.setData({ selectedTab })
      }
      this.syncUiStyles(selectedTab)
    },

    handleTabTap(e) {
      const { tab } = e.currentTarget.dataset
      if (tab === 'publish') {
        wx.navigateTo({
          url: '/pages/publish/publish'
        })
        return
      }

      const url = tab === 'mine' ? '/pages/mine/mine' : '/pages/index/index'
      wx.switchTab({ url })
    },

    syncSelectedTab() {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const route = currentPage ? currentPage.route : ''
      const selectedTab = route === 'pages/mine/mine' ? 'mine' : 'hall'
      this.setActiveTab(selectedTab)
    },

    syncUiStyles(selectedTab = this.data.selectedTab) {
      const { activeColor, inactiveColor, publishSize, publishOffset, publishFontSize } = this.data.uiTokens
      const activeStyle = `color: ${activeColor}; font-weight: 600;`
      const inactiveStyle = `color: ${inactiveColor};`
      const publishStyle = [
        `width: ${publishSize}rpx`,
        `height: ${publishSize}rpx`,
        `line-height: ${publishSize}rpx`,
        `font-size: ${publishFontSize}rpx`,
        `margin-top: -${publishOffset}rpx`
      ].join('; ')
      this.setData({
        hallLabelStyle: selectedTab === 'hall' ? activeStyle : inactiveStyle,
        mineLabelStyle: selectedTab === 'mine' ? activeStyle : inactiveStyle,
        publishStyle
      })
    }
  },

  lifetimes: {
    attached() {
      this.syncUiStyles()
      this.syncSelectedTab()
    }
  },

  pageLifetimes: {
    show() {
      this.syncSelectedTab()
    }
  }
})
