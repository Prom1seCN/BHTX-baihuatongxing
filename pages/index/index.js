const { getLocationFilterOptions } = require('../../utils/locations')
const { formatTripList, getTripTimestamp } = require('../../utils/trip-formatter')
const request = require('../../utils/request')

const PAGE_SIZE = 20

Page({
  data: {
    filters: {
      dates: ['全部时间', '今天', '明天', '后天'],
      locations: getLocationFilterOptions()
    },
    allTrips: [],
    _rawTrips: [],
    _filteredTrips: [],
    selectedDate: '全部时间',
    selectedCustomDate: '',
    pickerDisplayText: '📅 选日期',
    pickerStart: '',
    pickerEnd: '',
    selectedDepartures: ['全部'],
    selectedDestinations: ['全部'],
    departureActiveMap: {},
    destinationActiveMap: {},
    isVerified: false,
    displayCount: PAGE_SIZE,
    hasMore: true,
    isLoadingMore: false
  },

  onLoad() {
    const today = new Date()
    const pickerEnd = this.formatDate(this.addDays(today, 14))
    this.setData({
      pickerStart: this.formatDate(today),
      pickerEnd
    })
  },

  onShow() {
    this.syncTabBar('hall')
    this.syncTrips()
    this.showDisclaimerIfNeeded()
    this.setData({ isVerified: !!wx.getStorageSync('isVerified') })
  },

  showDisclaimerIfNeeded() {
    const hasAgreed = wx.getStorageSync('disclaimer_agreed')
    if (hasAgreed) return

    wx.showModal({
      title: '欢迎使用【百花同行】',
      content: '这是北化学子专属的纯公益互助出行平台。进入大厅前请知悉：\n\n本平台仅提供校内同行信息展示，不提供车辆，不收取费用。\n\n强烈呼吁大家匹配后共同呼叫正规网约车，坚决拒绝乘坐无资质黑车！乘车安全由正规网约车平台负责。\n\n车费由同学们线下协商，切勿盲目提前转账，谨防诈骗。平台不对线下的爽约或经济纠纷承担连带责任。',
      confirmText: '我已阅读并同意',
      showCancel: false,
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('disclaimer_agreed', true)
        }
      }
    })
  },

  addDays(date, days) {
    const targetDate = new Date(date)
    targetDate.setDate(targetDate.getDate() + days)
    return targetDate
  },

  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  formatMonthDay(dateText) {
    return dateText.slice(5)
  },

  applyFilters() {
    const { _rawTrips, selectedDate, selectedCustomDate, selectedDepartures, selectedDestinations } = this.data
    const today = this.formatDate(new Date())
    const tomorrow = this.formatDate(this.addDays(new Date(), 1))
    const dayAfterTomorrow = this.formatDate(this.addDays(new Date(), 2))

    const filteredTrips = _rawTrips.filter((trip) => {
      let matchedDate = true
      if (selectedDate === '今天') {
        matchedDate = trip.exact_date === today
      } else if (selectedDate === '明天') {
        matchedDate = trip.exact_date === tomorrow
      } else if (selectedDate === '后天') {
        matchedDate = trip.exact_date === dayAfterTomorrow
      } else if (selectedDate === 'CUSTOM') {
        matchedDate = trip.exact_date === selectedCustomDate
      }

      const matchedDeparture =
        !selectedDepartures.length ||
        selectedDepartures.includes('全部') ||
        selectedDepartures.includes(trip.departure)
      const matchedDestination =
        !selectedDestinations.length ||
        selectedDestinations.includes('全部') ||
        selectedDestinations.includes(trip.destination)
      return matchedDate && matchedDeparture && matchedDestination
    })

    const displayCount = PAGE_SIZE
    this.setData({
      _filteredTrips: filteredTrips,
      allTrips: filteredTrips.slice(0, displayCount),
      displayCount,
      hasMore: filteredTrips.length > displayCount
    })
  },

  handleDateChange(e) {
    const { value } = e.currentTarget.dataset
    if (value === this.data.selectedDate) return
    this.setData(
      {
        selectedDate: value,
        selectedCustomDate: '',
        pickerDisplayText: '📅 选日期'
      },
      () => this.applyFilters()
    )
  },

  handlePickerDateChange(e) {
    const selectedCustomDate = e.detail.value
    this.setData(
      {
        selectedDate: 'CUSTOM',
        selectedCustomDate,
        pickerDisplayText: `📅 ${this.formatMonthDay(selectedCustomDate)}`
      },
      () => this.applyFilters()
    )
  },

  handleDepartureChange(e) {
    const { value } = e.currentTarget.dataset
    const selectedDepartures = this.toggleLocationSelection(this.data.selectedDepartures, value)
    this.setData({ selectedDepartures }, () => {
      this.syncLocationActiveMap()
      this.applyFilters()
    })
  },

  handleDestinationChange(e) {
    const { value } = e.currentTarget.dataset
    const selectedDestinations = this.toggleLocationSelection(this.data.selectedDestinations, value)
    this.setData({ selectedDestinations }, () => {
      this.syncLocationActiveMap()
      this.applyFilters()
    })
  },

  toggleLocationSelection(selectedValues, value) {
    if (value === '全部') {
      return ['全部']
    }

    const nextValues = selectedValues.filter((item) => item !== '全部')
    const currentIndex = nextValues.indexOf(value)
    if (currentIndex > -1) {
      nextValues.splice(currentIndex, 1)
      if (nextValues.length === 0) {
        return ['全部']
      }
      return nextValues
    }

    nextValues.push(value)
    return nextValues
  },

  syncLocationActiveMap() {
    const departureActiveMap = {}
    const destinationActiveMap = {}
    this.data.selectedDepartures.forEach((item) => {
      departureActiveMap[item] = true
    })
    this.data.selectedDestinations.forEach((item) => {
      destinationActiveMap[item] = true
    })
    this.setData({
      departureActiveMap,
      destinationActiveMap
    })
  },

  syncTrips() {
    wx.showLoading({ title: '加载中...' })

    request({
      url: `/trips?_t=${Date.now()}`,
      method: 'GET',
      needAuth: false
    })
      .then((data) => {
        wx.hideLoading()

        const formattedData = formatTripList(data)
        const sortedTrips = formattedData.sort((a, b) => getTripTimestamp(a) - getTripTimestamp(b))
        const displayCount = PAGE_SIZE

        this.setData({
          _rawTrips: sortedTrips,
          _filteredTrips: sortedTrips,
          allTrips: sortedTrips.slice(0, displayCount),
          displayCount,
          hasMore: sortedTrips.length > displayCount
        })
      })
      .catch((err) => {
        wx.hideLoading()
        console.error('网络请求错误:', err)
        wx.showToast({ title: '网络连接失败', icon: 'none' })
      })
  },

  handleScrollToLower() {
    const { _filteredTrips, displayCount, hasMore, isLoadingMore } = this.data
    if (!hasMore || isLoadingMore) return

    this.setData({ isLoadingMore: true })

    const newCount = displayCount + PAGE_SIZE
    const allTrips = _filteredTrips.slice(0, newCount)

    this.setData({
      allTrips,
      displayCount: newCount,
      hasMore: newCount < _filteredTrips.length,
      isLoadingMore: false
    })
  },

  syncTabBar(tab) {
    if (typeof this.getTabBar !== 'function') return
    const tabBar = this.getTabBar()
    if (!tabBar || typeof tabBar.setActiveTab !== 'function') return
    tabBar.setActiveTab(tab)
  },

  handleTripCardTap(e) {
    const tripId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${tripId || ''}`
    })
  },

  onShareAppMessage() {
    return {
      title: '百花同行 - 专属北化学子的拼车大厅',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: '百花同行 - 专属北化学子的拼车大厅'
    }
  }
})
