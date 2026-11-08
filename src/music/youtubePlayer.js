let apiPromise

export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const previousReady = window.onYouTubeIframeAPIReady
    const timeout = setTimeout(() => fail(), 20000)
    function cleanup() {
      clearTimeout(timeout)
      window.onYouTubeIframeAPIReady = previousReady
    }
    function fail() {
      cleanup()
      script.remove()
      reject(new Error('Không tải được YouTube Player API. Kiểm tra kết nối hoặc trình chặn quảng cáo rồi thử lại.'))
    }
    window.onYouTubeIframeAPIReady = () => {
      cleanup()
      resolve(window.YT)
      previousReady?.()
    }
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = fail
    document.head.appendChild(script)
  }).catch(error => { apiPromise = null; throw error })
  return apiPromise
}

// Keep provider state and timers together so events from an old player cannot
// change the next song after the iframe has been replaced.
export function connectYouTubePlayer(YT, frame, callbacks) {
  let disposed = false
  let ready = false
  let ended = false
  let timer
  function updateTime(player) {
    if (disposed) return
    const seconds = player.getDuration()
    if (Number.isFinite(seconds) && seconds > 0) callbacks.duration(seconds)
    const position = player.getCurrentTime()
    if (Number.isFinite(position)) callbacks.time(position)
  }
  const player = new YT.Player(frame, {
    events: {
      onReady(event) {
        if (disposed) return
        ready = true
        updateTime(event.target)
        timer = setInterval(() => updateTime(event.target), 1000)
      },
      onStateChange(event) {
        if (disposed) return
        updateTime(event.target)
        callbacks.playing(event.data === YT.PlayerState.PLAYING)
        if (event.data === YT.PlayerState.PLAYING) ended = false
        if (event.data === YT.PlayerState.ENDED && !ended) {
          ended = true
          callbacks.ended()
        }
      },
      onAutoplayBlocked() {
        if (disposed) return
        callbacks.playing(false)
        callbacks.error('Trình duyệt chặn tự phát. Bấm nút phát trong khung YouTube để tiếp tục.')
      },
      onError() {
        if (disposed) return
        callbacks.playing(false)
        callbacks.error('Video YouTube không phát được hoặc không cho phép nhúng trên web.')
      },
    },
  })
  return {
    toggle() {
      if (!ready || disposed) return false
      if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo()
      else player.playVideo()
      return true
    },
    restart() {
      if (!ready || disposed) return
      player.seekTo(0, true)
      player.playVideo()
    },
    destroy() {
      disposed = true
      clearInterval(timer)
      player.destroy()
    },
  }
}
