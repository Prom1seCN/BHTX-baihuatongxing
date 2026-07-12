const API_BASE_URL = 'https://bhtx.prom1se.cn/api'

function normalizeUrl(url) {
  if (!url) return API_BASE_URL
  if (/^https?:\/\//.test(url)) return url
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

async function handleUnauthorized() {
  wx.removeStorageSync('token')
  
  // 尝试静默重连
  const app = getApp()
  if (app && typeof app.checkLogin === 'function') {
    try {
      const loginData = await app.checkLogin()
      if (loginData && loginData.token) {
        wx.showToast({ title: '登录已刷新，请重试', icon: 'none' })
        return
      }
    } catch (e) {
      console.error('Silent login failed', e)
    }
  }

  wx.removeStorageSync('isVerified')
  wx.removeStorageSync('userEmail')

  wx.showToast({
    title: '登录已过期，请重新认证',
    icon: 'none'
  })

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const currentRoute = currentPage ? currentPage.route : ''
  if (currentRoute === 'pages/auth/auth') return

  wx.navigateTo({
    url: '/pages/auth/auth',
    fail: () => {
      wx.redirectTo({
        url: '/pages/auth/auth'
      })
    }
  })
}

function request(options = {}) {
  const {
    url = '',
    method = 'GET',
    data = {},
    header = {},
    needAuth = true
  } = options

  const finalHeader = {
    'content-type': 'application/json',
    ...header
  }

  if (needAuth) {
    const token = wx.getStorageSync('token')
    if (token) {
      finalHeader.Authorization = `Bearer ${token}`
    }
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: normalizeUrl(url),
      method,
      data,
      header: finalHeader,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }
        if (res.statusCode === 401) {
          handleUnauthorized()
        }
        reject({
          statusCode: res.statusCode,
          data: res.data
        })
      },
      fail: (error) => reject(error)
    })
  })
}

module.exports = request
