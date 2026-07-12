const { getLocations } = require('../../utils/locations')
const request = require('../../utils/request')
const CONTACT_STORAGE_KEY = 'lastContact'

Page({
  data: {
    activeTab: 'immediate',
    locations: getLocations(),
    locationPickerList: [...getLocations(), '自定义'],
    immediateLocations: [
      { from: '北化北区', to: '昌平西山口' },
      { from: '昌平西山口', to: '北化北区' }
    ],
    selectedImmediateRoute: 0,
    isCustomDeparture: false,
    isCustomDestination: false,
    pickerStart: '',
    pickerEnd: '',
    roundedNowTime: '',
    timePickerRange: [[], []],
    timePickerValue: [0, 0],
    immediateMinuteOptions: ['5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '60'],
    immediateMinuteIndex: 1,
    agreementChecked: false,
    form: {
      departureDate: '',
      departureTime: '',
      departure: '',
      destination: '',
      customDeparture: '',
      customDestination: '',
      contact: '',
      remark: ''
    }
  },

  onLoad() {
    const today = new Date()
    const roundedFuture = this.ceilToNextFiveMinutes(new Date(today.getTime() + 30 * 60 * 1000))
    const roundedNowTime = this.formatTime(roundedFuture)
    const pickerEnd = this.formatDate(this.addDays(today, 14))
    const { timePickerRange, timePickerValue } = this.buildTimePickerData(roundedNowTime)
    const lastContact = (wx.getStorageSync(CONTACT_STORAGE_KEY) || '').trim()

    const todayDateText = this.formatDate(today)
    const defaultRoute = this.data.immediateLocations[this.data.selectedImmediateRoute]

    this.setData({
      pickerStart: todayDateText,
      pickerEnd,
      roundedNowTime,
      timePickerRange,
      timePickerValue,
      'form.departureDate': todayDateText,
      'form.departureTime': roundedNowTime,
      'form.contact': lastContact,
      'form.departure': defaultRoute.from,
      'form.destination': defaultRoute.to
    })
  },

  handleTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    if (tab === 'scheduled') {
      this.initScheduledDefaults()
    }
  },

  initScheduledDefaults() {
    const today = new Date()
    const roundedFuture = this.ceilToNextFiveMinutes(new Date(today.getTime() + 30 * 60 * 1000))
    const roundedNowTime = this.formatTime(roundedFuture)
    const { timePickerRange, timePickerValue } = this.buildTimePickerData(roundedNowTime)

    this.setData({
      roundedNowTime,
      timePickerRange,
      timePickerValue,
      'form.departureDate': this.formatDate(today),
      'form.departureTime': roundedNowTime,
      'form.departure': '',
      'form.destination': '',
      'form.customDeparture': '',
      'form.customDestination': '',
      'form.remark': '',
      isCustomDeparture: false,
      isCustomDestination: false
    })
  },

  handleImmediateMinuteChange(e) {
    const index = parseInt(e.detail.value, 10)
    this.setData({ immediateMinuteIndex: index })
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

  formatTime(date) {
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${hour}:${minute}`
  },

  ceilToNextFiveMinutes(date) {
    const next = new Date(date.getTime())
    next.setSeconds(0, 0)
    const minute = next.getMinutes()
    const remainder = minute % 5
    if (remainder !== 0) {
      next.setMinutes(minute + (5 - remainder))
    }
    if (next.getTime() <= date.getTime()) {
      next.setMinutes(next.getMinutes() + 5)
    }
    return next
  },

  buildTimePickerData(defaultTimeText) {
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
    const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))
    const [hourText, minuteText] = defaultTimeText.split(':')
    const hourIndex = Math.max(hours.indexOf(hourText), 0)
    const minuteIndex = Math.max(minutes.indexOf(minuteText), 0)
    return {
      timePickerRange: [hours, minutes],
      timePickerValue: [hourIndex, minuteIndex]
    }
  },

  handleDateChange(e) {
    this.setData({
      'form.departureDate': e.detail.value
    })
  },

  handleTimeChange(e) {
    const [hourIndex, minuteIndex] = e.detail.value
    const hours = this.data.timePickerRange[0] || []
    const minutes = this.data.timePickerRange[1] || []
    const hourText = hours[hourIndex] || '00'
    const minuteText = minutes[minuteIndex] || '00'
    const selectedTime = `${hourText}:${minuteText}`
    this.setData({
      'form.departureTime': selectedTime,
      timePickerValue: [hourIndex, minuteIndex]
    })
  },

  handleDepartureChange(e) {
    const idx = e.detail.value
    const location = this.data.locationPickerList[idx]
    if (location === '自定义') {
      this.setData({
        isCustomDeparture: true,
        'form.departure': '自定义',
        'form.customDeparture': ''
      })
    } else {
      if (location === this.data.form.destination && !this.data.isCustomDestination) {
        this.showMissingToast('出发地和目的地不能相同')
        return
      }
      this.setData({
        isCustomDeparture: false,
        'form.departure': location,
        'form.customDeparture': ''
      })
    }
  },

  handleDestinationChange(e) {
    const idx = e.detail.value
    const location = this.data.locationPickerList[idx]
    if (location === '自定义') {
      this.setData({
        isCustomDestination: true,
        'form.destination': '自定义',
        'form.customDestination': ''
      })
    } else {
      if (location === this.data.form.departure && !this.data.isCustomDeparture) {
        this.showMissingToast('出发地和目的地不能相同')
        return
      }
      this.setData({
        isCustomDestination: false,
        'form.destination': location,
        'form.customDestination': ''
      })
    }
  },

  handleCustomDepartureInput(e) {
    const value = e.detail.value.replace(/[^\u4e00-\u9fa5]/g, '').slice(0, 8)
    this.setData({
      'form.customDeparture': value,
      'form.departure': value
    })
  },

  handleCustomDestinationInput(e) {
    const value = e.detail.value.replace(/[^\u4e00-\u9fa5]/g, '').slice(0, 8)
    this.setData({
      'form.customDestination': value,
      'form.destination': value
    })
  },

  handleContactInput(e) {
    this.setData({
      'form.contact': (e.detail.value || '').trim()
    })
  },

  handleRemarkInput(e) {
    this.setData({
      'form.remark': (e.detail.value || '').trim()
    })
  },

  handleImmediateRouteSelect(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10)
    const route = this.data.immediateLocations[index]
    this.setData({
      selectedImmediateRoute: index,
      'form.departure': route.from,
      'form.destination': route.to
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

  async checkTextSafety(text) {
    if (!text) return true
    const cacheKey = 'text_review_' + this.simpleHash(text)
    try {
      const cached = wx.getStorageSync(cacheKey)
      if (cached && Date.now() - cached.ts < 2 * 60 * 60 * 1000) {
        return cached.safe
      }
    } catch (e) {}

    try {
      const res = await request({
        url: '/text-review',
        method: 'POST',
        data: { text }
      })
      const safe = res.suggestion === 'Pass'
      try {
        wx.setStorageSync(cacheKey, { safe, ts: Date.now() })
      } catch (e) {}
      return safe
    } catch (err) {
      console.error('文本审查失败:', err)
      return true
    }
  },

  simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  },

  async handleSubmit() {
    const isVerified = !!wx.getStorageSync('isVerified')
    if (!isVerified) {
      wx.showModal({
        title: '需要认证',
        content: '为保证校友安全，请先进行北化邮箱认证',
        confirmText: '去认证',
        success: ({ confirm }) => {
          if (!confirm) return
          wx.navigateTo({
            url: '/pages/auth/auth'
          })
        }
      })
      return
    }

    const { departureDate, departureTime, departure, destination, contact, customDeparture, customDestination, remark } = this.data.form
    const { agreementChecked, activeTab, isCustomDeparture, isCustomDestination } = this.data
    const todayText = this.formatDate(new Date())
    const maxDateText = this.formatDate(this.addDays(new Date(), 14))

    if (activeTab === 'immediate') {
      const { departure, destination, contact } = this.data.form
      const { immediateMinuteOptions, immediateMinuteIndex } = this.data
      const selectedMinutes = parseInt(immediateMinuteOptions[immediateMinuteIndex], 10)

      if (!departure || !destination) {
        this.showMissingToast('请选择路线')
        return
      }

      if (!contact) {
        this.showMissingToast('请填写联系方式')
        return
      }
      if (!agreementChecked) {
        this.showMissingToast('请先勾选并同意免责声明与隐私协议')
        return
      }

      const now = new Date()
      const departureDateTime = new Date(now.getTime() + selectedMinutes * 60 * 1000)
      const departureDate = this.formatDate(departureDateTime)
      const departureTime = this.formatTime(departureDateTime)

      wx.showLoading({ title: '发布中...' })
      try {
        await request({
          url: '/trips',
          method: 'POST',
          data: {
            from: departure,
            to: destination,
            date: departureDate,
            time: departureTime,
            contact,
            tripType: 'immediate'
          }
        })

        wx.hideLoading()
        wx.setStorageSync(CONTACT_STORAGE_KEY, contact)
        wx.showToast({
          title: '发布成功',
          icon: 'success'
        })
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index'
          })
        }, 1500)
      } catch (err) {
        wx.hideLoading()
        console.error('发布请求失败:', err)
        this.showMissingToast((err && err.data && err.data.message) || '网络错误，请稍后再试')
      }
      return
    }

    if (!departureDate) {
      this.showMissingToast('请选择出发日期')
      return
    }
    if (departureDate < todayText) {
      this.showMissingToast('出发日期必须是今天或之后')
      return
    }
    if (departureDate > maxDateText) {
      this.showMissingToast('最多可发布15天内行程')
      return
    }
    if (!departureTime) {
      this.showMissingToast('请选择出发时间')
      return
    }
    if (Number(departureTime.slice(3)) % 5 !== 0) {
      this.showMissingToast('出发时间分钟需为5的倍数')
      return
    }
    const departureDateTime = new Date(`${departureDate}T${departureTime}:00`)
    if (departureDateTime.getTime() <= Date.now()) {
      this.showMissingToast('出发时间必须晚于当前时间')
      return
    }

    const finalDeparture = isCustomDeparture ? customDeparture : departure
    const finalDestination = isCustomDestination ? customDestination : destination

    if (!finalDeparture) {
      this.showMissingToast('请选择或输入出发地')
      return
    }
    if (!finalDestination) {
      this.showMissingToast('请选择或输入目的地')
      return
    }
    if (finalDeparture === finalDestination) {
      this.showMissingToast('出发地和目的地不能相同')
      return
    }

    if (isCustomDeparture && !/^[\u4e00-\u9fa5]{1,8}$/.test(customDeparture)) {
      this.showMissingToast('自定义出发地需为1-8个汉字')
      return
    }
    if (isCustomDestination && !/^[\u4e00-\u9fa5]{1,8}$/.test(customDestination)) {
      this.showMissingToast('自定义目的地需为1-8个汉字')
      return
    }

    if (!contact) {
      this.showMissingToast('请填写联系方式')
      return
    }
    if (!agreementChecked) {
      this.showMissingToast('请先勾选并同意免责声明与隐私协议')
      return
    }

    wx.showLoading({ title: '发布中...' })

    const textsToReview = []
    if (isCustomDeparture && customDeparture) textsToReview.push(customDeparture)
    if (isCustomDestination && customDestination) textsToReview.push(customDestination)
    if (remark) textsToReview.push(remark)

    for (let i = 0; i < textsToReview.length; i++) {
      const safe = await this.checkTextSafety(textsToReview[i])
      if (!safe) {
        wx.hideLoading()
        this.showMissingToast('输入内容包含违规信息，请修改')
        return
      }
    }

    try {
      await request({
        url: '/trips',
        method: 'POST',
        data: {
          from: finalDeparture,
          to: finalDestination,
          date: departureDate,
          time: departureTime,
          contact,
          remark: remark || undefined
        }
      })

      wx.hideLoading()
      wx.setStorageSync(CONTACT_STORAGE_KEY, contact)
      wx.showToast({
        title: '发布成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        })
      }, 1500)
    } catch (err) {
      wx.hideLoading()
      console.error('发布请求失败:', err)
      this.showMissingToast((err && err.data && err.data.message) || '网络错误，请稍后再试')
    }
  },

  showMissingToast(title) {
    wx.showToast({
      title,
      icon: 'none'
    })
  }
})
