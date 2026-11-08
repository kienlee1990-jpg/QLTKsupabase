<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import WelcomeSlideshow from './components/WelcomeSlideshow.vue'
import YouTubePlayer from './components/YouTubePlayer.vue'
import SongArtwork from './components/SongArtwork.vue'
import { auth } from '../stores/auth'
import { getMusicLinkMetadata } from '../services/musicMetadata'
import { deleteSong as removeSong, getManagedSongs, getPlaylists, getSongs, saveSong, setSongActive as updateSongStatus, updateSong as editSongRecord, uploadSong as uploadSongFile } from '../services/music'
import { AudioLines, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Disc3, Download, Ellipsis, Heart, Home, Library, ListMusic, LogOut, Menu, Mic2, Music2, Pause, Pencil, Play, Plus, Repeat2, Search, Settings2, Shuffle, SkipBack, SkipForward, Trash2, Upload, Volume2, X } from '@lucide/vue'

const router = useRouter()
const songs = ref([])
const managedSongs = ref([])
const showEditSong = ref(false)
const editingSong = ref(null)
const editError = ref('')
const isSavingEdit = ref(false)
const playlists = ref([])
const activeSong = ref(null)
const query = ref('')
const searchType = ref('song')
const activeNav = ref('Khám phá')
const isPlaying = ref(false)
const isLiked = ref(false)
const isRepeating = ref(false)
const isShuffling = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(72)
const showUpload = ref(false)
const selectedFile = ref(null)
const uploadTitle = ref('')
const uploadArtist = ref('')
const uploadMode = ref('file')
const audioLink = ref('')
const metadataLoading = ref(false)
const metadataNote = ref('')
const lastAutoTitle = ref('')
const lastAutoArtist = ref('')
const isUploading = ref(false)
const uploadError = ref('')
const audio = ref(null)
const toast = ref('')
const isLoggingOut = ref(false)
const isResolvingEmbed = ref(false)
const soundcloudFrame = ref(null)
const youtubePlayer = ref(null)
let soundcloudApiPromise = null
let soundcloudWidget = null
let metadataTimer = null
let metadataRequestId = 0
const isAdmin = auth.isAdmin
const session = auth.session
const currentIndex = computed(() => songs.value.findIndex(song => song.id === activeSong.value?.id))
const progress = computed(() => duration.value ? (currentTime.value / duration.value) * 100 : 0)
const visibleSongs = computed(() => songs.value.filter(song => {
  if (!song.audioUrl) return false
  const needle = query.value.trim().toLocaleLowerCase('vi')
  return !needle || `${song.title} ${song.artist} ${song.album}`.toLocaleLowerCase('vi').includes(needle)
}))
const enabledSongCount = computed(() => managedSongs.value.filter(song => song.isActive).length)
const stoppedSongCount = computed(() => managedSongs.value.length - enabledSongCount.value)
const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
async function logout() {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try { await auth.signOut(); await router.replace('/login') }
  catch (error) { showToast(error.message || 'Không thể đăng xuất. Vui lòng thử lại.') }
  finally { isLoggingOut.value = false }
}
async function readResponse(response) {
  const body = await response.text()
  if (!body.trim()) return null
  try { return JSON.parse(body) } catch { return { message: body } }
}
function apiErrorMessage(response, payload, fallback) {
  if ([404, 405].includes(response.status)) return 'API chưa được cập nhật. Hãy dừng ứng dụng bằng Ctrl+C rồi chạy lại npm start.'
  if (payload?.message) return payload.message
  return `${fallback} (HTTP ${response.status})`
}

async function loadSongs() {
  try { songs.value = await getSongs() }
  catch (error) { songs.value = []; showToast(error.message || 'Không tải được thư viện nhạc. Hãy chạy migration Supabase.') }
}
async function loadManagedSongs() {
  if (!isAdmin.value) return
  try { managedSongs.value = await getManagedSongs() }
  catch (error) { managedSongs.value = []; showToast(error.message || 'Không tải được danh sách quản lý bài hát.') }
}
async function navigate(name) {
  if (name === 'Quản lý' && !isAdmin.value) { showToast('Chỉ quản trị viên mới có thể quản lý thư viện.'); return }
  activeNav.value = name
  if (name === 'Quản lý') await loadManagedSongs()
}
async function setSongActive(song, isActive) {
  try {
    await updateSongStatus(song.id, isActive)
    if (!isActive && activeSong.value?.id === song.id) {
      audio.value?.pause(); soundcloudWidget?.pause(); soundcloudWidget = null; activeSong.value = null; isPlaying.value = false
    }
    await Promise.all([loadManagedSongs(), loadSongs()])
    showToast(isActive ? 'Đã cho phép bài hát xuất hiện trong danh sách phát.' : 'Đã dừng bài hát và ẩn khỏi danh sách phát.')
  } catch (error) { showToast(error.message || 'Không cập nhật được bài hát.') }
}
async function deleteSong(song) {
  if (!window.confirm(`Xóa hẳn “${song.title}” khỏi thư viện?`)) return
  try {
    await removeSong(song.id)
    if (activeSong.value?.id === song.id) { audio.value?.pause(); soundcloudWidget?.pause(); soundcloudWidget = null; activeSong.value = null; isPlaying.value = false }
    await Promise.all([loadManagedSongs(), loadSongs()])
    showToast('Đã xóa hẳn bài hát khỏi thư viện.')
  } catch (error) { showToast(error.message || 'Không xóa được bài hát.') }
}
function openEditSong(song) { editingSong.value = { ...song }; editError.value = ''; showEditSong.value = true }
async function saveSongEdits() {
  if (!editingSong.value) return
  isSavingEdit.value = true; editError.value = ''
  try {
    const song = editingSong.value
    await editSongRecord(song.id, { title: song.title, artist: song.artist, audioUrl: song.audioUrl })
    if (activeSong.value?.id === song.id) { audio.value?.pause(); soundcloudWidget?.pause(); soundcloudWidget = null; activeSong.value = null; isPlaying.value = false }
    showEditSong.value = false
    await Promise.all([loadManagedSongs(), loadSongs()])
    showToast('Đã cập nhật thông tin bài hát.')
  } catch (error) { editError.value = error.message || 'Không lưu được thay đổi.' }
  finally { isSavingEdit.value = false }
}
async function loadPlaylists() {
  try { playlists.value = await getPlaylists() }
  catch (error) { playlists.value = []; showToast(error.message || 'Không tải được danh sách phát.') }
}
async function playSong(song) {
  if (!song?.audioUrl) return
  if (activeSong.value?.id === song.id && song.sourceType === 'youtube' && youtubePlayer.value) { togglePlayback(); return }
  if (activeSong.value?.id === song.id && song.sourceType === 'soundcloud' && soundcloudWidget) { soundcloudWidget.toggle(); return }
  activeSong.value = song
  isPlaying.value = false
  isLiked.value = false
  currentTime.value = 0
  if (song.sourceType && song.sourceType !== 'audio') {
    if (audio.value) { audio.value.pause(); audio.value.removeAttribute('src'); audio.value.load() }
    isPlaying.value = false
    duration.value = 0
    if (song.sourceType === 'soundcloud' && new URL(song.audioUrl).hostname === 'on.soundcloud.com') {
      isResolvingEmbed.value = true
      isResolvingEmbed.value = false
    }
    return
  }
  duration.value = 0
  if (audio.value) {
    audio.value.pause()
    audio.value.src = song.audioUrl
    audio.value.volume = volume.value / 100
    audio.value.play().then(() => { isPlaying.value = true }).catch(() => { isPlaying.value = false; showToast('Trình duyệt chặn tự phát. Nhấn nút phát để bắt đầu nghe.') })
  } else {
    isPlaying.value = false
    showToast('Trình phát chưa sẵn sàng. Tải lại trang rồi thử lại nhé.')
  }
}
function togglePlayback() {
  if (!activeSong.value) { if (visibleSongs.value.length) playSong(visibleSongs.value[0]); else showToast('Hãy tải một bài hát lên để bắt đầu nghe.'); return }
  if (!activeSong.value.audioUrl) { showToast('Bài hát này chưa có file âm thanh.'); return }
  if (activeSong.value.sourceType === 'youtube') {
    if (!youtubePlayer.value?.toggle()) showToast('Player YouTube đang tải, thử lại sau giây lát nhé.')
    return
  }
  if (activeSong.value.sourceType === 'soundcloud') {
    if (soundcloudWidget) soundcloudWidget.toggle()
    else showToast('Player SoundCloud đang tải, thử lại sau giây lát nhé.')
    return
  }
  if (activeSong.value.sourceType && activeSong.value.sourceType !== 'audio') { showToast('Dùng nút phát trong player nhúng nhé.'); return }
  if (audio.value?.paused) audio.value.play(); else audio.value?.pause()
}
function nextSong(direction = 1) {
  if (!songs.value.length) return
  let index = currentIndex.value < 0 ? 0 : (currentIndex.value + direction + songs.value.length) % songs.value.length
  if (isShuffling.value && direction > 0 && songs.value.length > 1) {
    do { index = Math.floor(Math.random() * songs.value.length) } while (index === currentIndex.value)
  }
  playSong(songs.value[index])
}
function handleEnded() {
  if (isRepeating.value && activeSong.value?.sourceType === 'youtube') { youtubePlayer.value?.restart(); return }
  if (isRepeating.value && audio.value) { audio.value.currentTime = 0; audio.value.play(); return }
  nextSong(1)
}
async function searchMusic() {
  if (!query.value.trim()) showToast('Đang hiển thị tất cả bài hát có file.')
  else showToast(`Tìm thấy ${visibleSongs.value.length} bài hát phù hợp.`)
}
function chooseFile(event) {
  selectedFile.value = event.target.files?.[0] || null
  if (selectedFile.value && !uploadTitle.value) uploadTitle.value = selectedFile.value.name.replace(/\.[^.]+$/, '')
  uploadError.value = ''
}
async function uploadSong() {
  if (!selectedFile.value) { uploadError.value = 'Chọn một file âm thanh trước nhé.'; return }
  if (!isAdmin.value) { uploadError.value = 'Chỉ quản trị viên mới có thể tải nhạc lên.'; return }
  isUploading.value = true; uploadError.value = ''
  try {
    const song = await uploadSongFile(selectedFile.value, uploadTitle.value || selectedFile.value.name.replace(/\.[^.]+$/, ''), uploadArtist.value)
    songs.value.unshift(song); playSong(song); showUpload.value = false; selectedFile.value = null; uploadTitle.value = ''; uploadArtist.value = ''; audioLink.value = ''; showToast('Đã tải nhạc lên Supabase Storage')
  } catch (error) { uploadError.value = error.message || 'Tải bài hát chưa thành công.' }
  finally { isUploading.value = false }
}
async function addSongLink() {
  if (!audioLink.value.trim()) { uploadError.value = 'Dán link bài hát vào trước nhé.'; return }
  if (!isAdmin.value) { uploadError.value = 'Chỉ quản trị viên mới có thể thêm bài hát.'; return }
  let url
  try { url = new URL(audioLink.value.trim()); if (!['http:', 'https:'].includes(url.protocol)) throw new Error() }
  catch { uploadError.value = 'Link bài hát chưa hợp lệ.'; return }
  isUploading.value = true; uploadError.value = ''
  try {
    const song = await saveSong({ title: uploadTitle.value || url.pathname.split('/').filter(Boolean).at(-1)?.replace(/\.[^.]+$/, '') || 'Bài hát mới', artist: uploadArtist.value, audioUrl: url.href })
    songs.value.unshift(song); playSong(song); showUpload.value = false; selectedFile.value = null; uploadTitle.value = ''; uploadArtist.value = ''; audioLink.value = ''; uploadMode.value = 'file'; showToast('Đã lưu link bài hát vào Supabase')
  } catch (error) { uploadError.value = error.message || 'Không thể thêm link này.' }
  finally { isUploading.value = false }
}
function providerDetailsForLink(url) { try { return new URL(url).hostname } catch { return '' } }
watch([audioLink, uploadMode, showUpload], ([url, mode, isOpen]) => {
  clearTimeout(metadataTimer)
  const requestId = ++metadataRequestId
  if (lastAutoTitle.value && uploadTitle.value === lastAutoTitle.value) uploadTitle.value = ''
  if (lastAutoArtist.value && uploadArtist.value === lastAutoArtist.value) uploadArtist.value = ''
  lastAutoTitle.value = ''; lastAutoArtist.value = ''
  metadataNote.value = ''; metadataLoading.value = false
  if (!isOpen || mode !== 'link' || !url.trim()) return
  metadataTimer = window.setTimeout(async () => {
    metadataLoading.value = true
    try {
      const metadata = await getMusicLinkMetadata(url.trim())
      if (requestId !== metadataRequestId) return
      if (metadata.title && (!uploadTitle.value.trim() || uploadTitle.value === lastAutoTitle.value)) {
        uploadTitle.value = metadata.title; lastAutoTitle.value = metadata.title
      }
      if (metadata.artist && (!uploadArtist.value.trim() || uploadArtist.value === lastAutoArtist.value)) {
        uploadArtist.value = metadata.artist; lastAutoArtist.value = metadata.artist
      }
      metadataNote.value = metadata.title || metadata.artist
        ? 'Đã lấy thông tin từ link. Bạn có thể sửa lại trước khi lưu.'
        : 'Nguồn này chưa trả thông tin; bạn có thể nhập tên thủ công.'
    } catch {
      if (requestId === metadataRequestId) metadataNote.value = 'Không đọc được metadata từ nguồn này; bạn có thể nhập tên thủ công.'
    } finally {
      if (requestId === metadataRequestId) metadataLoading.value = false
    }
  }, 450)
})
function externalEmbedUrl(song) {
  try {
    const url = new URL(song.audioUrl)
    if (song.sourceType === 'soundcloud') {
      const params = new URLSearchParams({ url: song.audioUrl, auto_play: 'true', visual: 'true', color: '6f9d4b', show_artwork: 'true' })
      return `https://w.soundcloud.com/player/?${params.toString()}`
    }
    if (song.sourceType === 'youtube') {
      const segments = url.pathname.split('/').filter(Boolean)
      const id = url.hostname === 'youtu.be' ? segments[0] : url.searchParams.get('v') || segments[segments.findIndex(part => ['embed', 'shorts', 'live', 'v'].includes(part)) + 1]
      const params = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1', enablejsapi: '1', origin: window.location.origin })
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params}`
    }
    if (song.sourceType === 'spotify') {
      const [type, id] = url.pathname.split('/').filter(Boolean).slice(-2)
      return `https://open.spotify.com/embed/${encodeURIComponent(type)}/${encodeURIComponent(id)}?theme=0`
    }
    if (song.sourceType === 'zingmp3') {
      const parts = url.pathname.split('/').filter(Boolean)
      const id = parts[0]?.toLowerCase() === 'embed' && parts[1]?.toLowerCase() === 'song' ? parts[2] : parts.at(-1)?.replace(/\.html$/i, '')
      return id ? `https://zingmp3.vn/embed/song/${encodeURIComponent(id)}?start=false` : ''
    }
  } catch { return '' }
  return ''
}
function loadSoundcloudWidgetApi() {
  if (window.SC?.Widget) return Promise.resolve(window.SC)
  if (soundcloudApiPromise) return soundcloudApiPromise
  soundcloudApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://w.soundcloud.com/player/api.js'
    script.onload = () => window.SC?.Widget ? resolve(window.SC) : reject(new Error('SoundCloud Widget API chưa sẵn sàng'))
    script.onerror = () => reject(new Error('Không tải được SoundCloud Widget API'))
    document.head.appendChild(script)
  })
  return soundcloudApiPromise
}
watch(() => [activeSong.value?.id, activeSong.value?.audioUrl, isResolvingEmbed.value], async () => {
  const song = activeSong.value
  if (!song || song.sourceType !== 'soundcloud' || isResolvingEmbed.value) return
  const songId = song.id
  await nextTick()
  try {
    const SC = await loadSoundcloudWidgetApi()
    if (activeSong.value?.id !== songId || !soundcloudFrame.value) return
    const widget = SC.Widget(soundcloudFrame.value)
    soundcloudWidget = widget
    widget.bind(SC.Widget.Events.READY, () => {
      if (activeSong.value?.id !== songId) return
      widget.getDuration(milliseconds => {
        if (activeSong.value?.id !== songId || !Number.isFinite(milliseconds) || milliseconds <= 0) return
        const time = formatTime(milliseconds / 1000)
        const currentSong = songs.value.find(item => item.id === songId)
        if (currentSong) currentSong.duration = time
        if (activeSong.value?.id === songId) duration.value = milliseconds / 1000
      })
      widget.bind(SC.Widget.Events.PLAY, () => { if (activeSong.value?.id === songId) isPlaying.value = true })
      widget.bind(SC.Widget.Events.PAUSE, () => { if (activeSong.value?.id === songId) isPlaying.value = false })
      widget.bind(SC.Widget.Events.FINISH, () => {
        if (activeSong.value?.id !== songId) return
        isPlaying.value = false
        if (isRepeating.value) { widget.seekTo(0); widget.play() }
        else nextSong(1)
      })
      widget.isPaused(paused => { if (activeSong.value?.id === songId) isPlaying.value = !paused })
    })
  } catch { /* SoundCloud iframe still plays normally if its optional status API is unavailable. */ }
})
function showToast(message) { toast.value = message; window.setTimeout(() => { toast.value = '' }, 2600) }
function setSeek(event) { if (!duration.value) return; const bounds = event.currentTarget.getBoundingClientRect(); const next = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * duration.value; currentTime.value = next; if (audio.value && activeSong.value?.audioUrl) audio.value.currentTime = next }
function handleLoadedMetadata() {
  if (!audio.value || !Number.isFinite(audio.value.duration)) return
  duration.value = audio.value.duration
  if (activeSong.value) activeSong.value.duration = formatTime(audio.value.duration)
}
function updateYouTubeDuration(seconds) {
  if (activeSong.value?.sourceType !== 'youtube') return
  duration.value = seconds
  activeSong.value.duration = formatTime(seconds)
  const song = songs.value.find(item => item.id === activeSong.value.id)
  if (song) song.duration = activeSong.value.duration
}
onMounted(async () => {
  await auth.init()
  await Promise.all([loadSongs(), loadPlaylists()])
  if (audio.value) audio.value.volume = volume.value / 100
  if (visibleSongs.value.length) await playSong(visibleSongs.value[0])
})
</script>

<template>
  <div class="app-shell">
    <div class="fireworks-overlay" aria-hidden="true"><i class="firework-burst burst-one"></i><i class="firework-burst burst-two"></i><i class="firework-burst burst-three"></i><i class="firework-burst burst-four"></i></div>
    <aside class="festive-rail festive-rail-left" aria-hidden="true">
      <img class="blossom-photo blossom-photo-left" src="/images/tet-blossoms-left-transparent.png" alt="" />
      <div class="couplet couplet-left"><span>Năm</span><span>Mới</span><span>Hạnh</span><span>Phúc</span><span>Bình</span><span>An</span><span>Đến</span><small>✿</small></div>
      <div class="banner-tassels"><i></i><i></i><b>福</b><b>福</b></div>
      <div class="rail-firework firework-left">✳</div>
    </aside>
    <aside class="festive-rail festive-rail-right" aria-hidden="true">
      <img class="blossom-photo blossom-photo-right" src="/images/tet-blossoms-transparent.png" alt="" />
      <div class="couplet couplet-right"><span>Ngày</span><span>Xuân</span><span>Vĩnh</span><span>Hoa</span><span>Phú</span><span>Quý</span><span>Về</span><small>✿</small></div>
      <div class="banner-tassels"><i></i><i></i><b>福</b><b>福</b></div>
      <div class="rail-firework firework-right">✳</div>
    </aside>
    <aside class="sidebar">
      <a class="brand" href="#top" aria-label="Giai Điệu Thanh Xuân"><span class="brand-mark"><AudioLines :size="24" /></span><span class="brand-copy"><b>thanhxuân</b><small>NHẠC CỦA MỘT THỜI</small></span></a>
      <div class="side-label">MENU</div>
      <nav class="main-nav" aria-label="Điều hướng">
        <button v-for="item in [{name:'Khám phá',icon:Home},{name:'Thư viện',icon:Library},{name:'Nghệ sĩ',icon:Mic2},...(isAdmin ? [{name:'Quản lý',icon:Settings2}] : [])]" :key="item.name" :class="['nav-item', {selected: activeNav === item.name}]" @click="navigate(item.name)"><component :is="item.icon" :size="19" :stroke-width="1.8"/><span>{{ item.name }}</span><span v-if="item.name === 'Khám phá'" class="nav-dot"></span></button>
      </nav>
      <div class="sidebar-divider"></div>
      <div class="side-heading"><span class="side-label">DANH SÁCH PHÁT</span><button v-if="isAdmin" class="icon-button side-plus" aria-label="Tạo danh sách phát" @click="showToast('Tính năng tạo playlist sẽ sớm có mặt')"><Plus :size="17"/></button></div>
      <button v-for="list in playlists" :key="list.id" class="playlist-link" @click="activeNav = 'Thư viện'"><span class="playlist-mini">{{ list.cover || '♡' }}</span><span>{{ list.name }}</span></button>
      <button v-if="isAdmin" class="playlist-link" @click="showToast('Tính năng tạo playlist sẽ sớm có mặt')"><span class="playlist-mini new-playlist"><Plus :size="14"/></span><span>Tạo playlist mới</span></button>
      <div class="sidebar-bottom"><div class="memory-card"><div class="memory-sun">✳</div><p>Những giai điệu<br/>của <em>thanh xuân</em></p><span>♪ &nbsp; nghe lại một thời</span><div class="memory-line"></div></div><button class="help-link" @click="showToast('Chúc bạn nghe nhạc thật vui!')"><CircleHelp :size="17"/> Trợ giúp</button></div>
    </aside>

    <main id="top" class="main-content">
      <header class="retro-masthead"><div class="masthead-stripes"></div><div class="masthead-logo"><a class="teen-mark" href="/" aria-label="8X Teen — phát hoặc tạm dừng nhạc" @click.prevent="togglePlayback">8X<small>TEEN</small></a></div><span class="masthead-tagline">XUANDIEUCLUB.TK <i>—</i> WEBSITE KẾT NỐI THẾ HỆ <b>8X, 9X, 2K</b></span><div class="masthead-title"><small>THẾ GIỚI GIẢI TRÍ 1.0</small><strong>XuandieuClub.TK</strong><span>ÂM NHẠC · KỶ NIỆM · BẠN BÈ</span></div><div class="masthead-polaroids"><div class="polaroid p-one"><img src="/images/portraits/D65A7652.jpg" alt="Ảnh chân dung cùng gấu bông" width="734" height="1100" /></div><div class="polaroid p-two"><img src="/images/portraits/D65A7603.jpg" alt="Ảnh cận cảnh cùng hai chú gấu bông" width="1100" height="734" /></div><div class="polaroid p-three"><img src="/images/portraits/D65A7749.jpg" alt="Ảnh kỷ niệm cùng bánh sinh nhật" width="734" height="1100" /></div></div><div class="masthead-girl masthead-portrait"><img src="/images/portraits/masthead-cutout.png" alt="Ảnh chân dung trang trí đầu trang" width="533" height="800" /></div><span class="masthead-confetti">✳</span></header>
      <header class="topbar"><button class="mobile-menu icon-button" aria-label="Mở menu"><Menu :size="21"/></button><div class="breadcrumb"><span>Âm nhạc</span><ChevronRight :size="14"/><b>{{ activeNav }}</b></div><div class="topbar-right"><button v-if="isAdmin" :class="['manage-top-button',{active:activeNav==='Quản lý'}]" @click="navigate(activeNav==='Quản lý'?'Khám phá':'Quản lý')"><Settings2 :size="15"/><span>{{ activeNav==='Quản lý'?'Quay lại nhạc':'Quản lý bài hát' }}</span></button><button v-if="isAdmin" class="upload-top" @click="showUpload = true"><Upload :size="15"/><span>Tải nhạc lên</span></button><a v-if="!session" class="login-top-button" href="/login?redirect=/">Đăng nhập</a><button v-if="session" class="logout-top-button" :disabled="isLoggingOut" @click="logout"><LogOut :size="15"/><span>{{ isLoggingOut ? 'Đang đăng xuất…' : 'Đăng xuất' }}</span></button><a v-if="session" class="avatar" href="/account" aria-label="Tài khoản" title="Tài khoản">A</a></div></header>
      <div class="page-body">
        <aside class="legacy-left"><section class="legacy-panel"><h3>CHUYÊN MỤC</h3><a v-for="item in ['GÁI XINH  💥','KẾT QUẢ SỐ XỔ','VIDEO  🔥','Lưu bút','Girl Việt Nam','Girl Trung Quốc','Girl Hàn Quốc','Girl Japan','Girl Thái Lan','BIKINI tuyển chọn','Gái cực xinh','Người mẫu ảnh','HOT GIRL','Hằng tuyển','Giải trí','Hình ảnh','Hoài niệm','Thủ thuật game','Thủ thuật hay','Tin tức']" :key="item" href="#music"><b>✚</b> {{ item }}</a></section><section class="legacy-panel"><h3>GÓC KỶ NIỆM</h3><a v-for="item in ['Tình yêu tuổi học trò','Lời muốn nói','Thơ tình','Nhật ký mùa hè','Bạn bè 4 phương']" :key="item" href="#music"><b>☷</b> {{ item }}</a></section><section class="legacy-panel rapper-panel"><h3>TOP RAPPER</h3><div class="rapper-list"><div v-for="rapper in [{name:'Kyo',image:'kyo'},{name:'Lil Shady',image:'lil-shady'},{name:'Lil Knight',image:'lil-knight'},{name:'Andree',image:'andree'},{name:'Lil Kani',image:'lil-kani'},{name:'Khánh Won',image:'khanh-won'},{name:'Young Uno',image:'young-uno'}]" :key="rapper.name" class="rapper-item"><img :src="`/images/rappers/${rapper.image}.jpg`" :alt="rapper.name" loading="lazy"/><b>{{ rapper.name }}</b></div></div></section><div class="left-sticker">✿<span>thanh xuân<br/><small>ngày ấy</small></span>✿</div></aside>
        <div class="legacy-center">
          <WelcomeSlideshow v-if="activeNav !== 'Quản lý'" />
          <section v-if="activeNav === 'Quản lý'" class="management-panel">
            <header class="management-heading"><div><span>THƯ VIỆN CỦA BẠN</span><h2>Quản lý bài hát</h2><p>Dừng bài để ẩn khỏi danh sách phát hoặc xóa hẳn khỏi thư viện.</p></div><button v-if="isAdmin" class="music-upload-button" @click="showUpload = true"><Upload :size="15"/> Thêm bài hát</button></header>
            <div class="management-stats"><div><span>Đang dùng</span><b>{{ enabledSongCount }}</b></div><div><span>Đã dừng</span><b>{{ stoppedSongCount }}</b></div><div><span>Tổng bài hát</span><b>{{ managedSongs.length }}</b></div></div>
            <div v-if="managedSongs.length" class="management-table">
              <div class="management-table-head"><span>BÀI HÁT</span><span>THỜI LƯỢNG</span><span>TRẠNG THÁI</span><span>THAO TÁC</span></div>
              <div v-for="(song,index) in managedSongs" :key="song.id" :class="['management-row',{inactive:!song.isActive}]">
                <span class="management-song-cover" :class="`cover-${index%6}`">{{ song.cover || '♫' }}</span><span class="management-song-info"><b>{{ song.title }}</b><small>{{ song.artist }} · {{ song.album }}</small></span>
                <span class="management-duration">{{ song.duration || '--:--' }}</span><span :class="['management-status',{stopped:!song.isActive}]"><i></i>{{ song.isActive ? 'Đang hiển thị' : 'Đã dừng' }}</span>
                <span class="management-actions"><button class="management-edit" aria-label="Sửa bài hát" title="Sửa bài hát và link" @click="openEditSong(song)"><Pencil :size="14"/><span>Sửa</span></button><button :class="['management-toggle',{restore:!song.isActive}]" @click="setSongActive(song,!song.isActive)">{{ song.isActive ? 'Dừng bài' : 'Khôi phục' }}</button><button class="management-delete" aria-label="Xóa hẳn bài hát" title="Xóa hẳn" @click="deleteSong(song)"><Trash2 :size="16"/></button></span>
              </div>
            </div>
            <div v-else class="management-empty"><Music2 :size="25"/><b>Chưa có bài hát nào để quản lý</b><span>Tải file hoặc thêm link nhạc để bắt đầu.</span><button v-if="isAdmin" class="music-upload-button" @click="showUpload = true"><Upload :size="15"/> Thêm bài hát</button></div>
          </section>
          <section v-else class="music-widget">
            <header class="music-widget-heading">
              <h2>NHẠC NỀN</h2>
              <button v-if="isAdmin" class="music-upload-button" @click="showUpload = true"><Upload :size="16"/> Tải nhạc lên</button>
            </header>
            <div v-if="activeSong && activeSong.sourceType && activeSong.sourceType !== 'audio'" class="soundcloud-panel">
              <div v-if="isResolvingEmbed" class="embed-loading">Đang mở liên kết SoundCloud...</div>
              <YouTubePlayer v-else-if="activeSong.sourceType === 'youtube'" :key="`${activeSong.id}:${activeSong.audioUrl}`" ref="youtubePlayer"
                :src="externalEmbedUrl(activeSong)" :title="`${activeSong.artist} - ${activeSong.title}`"
                @playing="isPlaying = $event" @duration="updateYouTubeDuration" @time="currentTime = $event"
                @ended="handleEnded" @error="showToast" />
              <iframe v-else ref="soundcloudFrame" class="soundcloud-embed" :src="externalEmbedUrl(activeSong)" :title="`${activeSong.artist} - ${activeSong.title}`" allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture" loading="lazy"></iframe>
              <div v-if="activeSong.sourceType === 'youtube'" class="youtube-playback-status">
                <span>{{ isPlaying ? 'Đang phát' : 'Đã tạm dừng / chờ phát' }}</span>
                <span>{{ formatTime(currentTime) }} / {{ duration > 0 ? formatTime(duration) : '--:--' }}</span>
              </div>
              <p>Player {{ activeSong.sourceType === 'soundcloud' ? 'SoundCloud' : activeSong.sourceType === 'youtube' ? 'YouTube' : activeSong.sourceType === 'spotify' ? 'Spotify' : 'Zing MP3' }} · <template v-if="activeSong.sourceType === 'zingmp3'">Bấm nút phát trong khung. <a class="provider-fallback" :href="activeSong.audioUrl" target="_blank" rel="noopener noreferrer">Mở bài gốc trên Zing MP3</a></template><template v-else>Link đã lưu trong Supabase</template></p>
            </div>
            <div v-else-if="activeSong" :class="['sound-player',{playing:isPlaying}]">
              <div class="sound-cover" :class="`sound-cover-${Math.max(0,currentIndex)%6}`"><span>{{ activeSong.cover || '♫' }}</span><small>GIAI ĐIỆU THANH XUÂN</small></div>
              <div class="sound-main">
                <div class="sound-head">
                  <button class="sound-play" :aria-label="isPlaying ? 'Tạm dừng' : 'Phát nhạc'" @click="togglePlayback"><Pause v-if="isPlaying" :size="27" fill="currentColor"/><Play v-else :size="27" fill="currentColor"/></button>
                  <div class="sound-track-meta"><span class="sound-artist">{{ activeSong.artist }}</span><h3 :title="activeSong.title">{{ activeSong.title }}</h3></div>
                  <div class="sound-actions">
                  <button :class="['sound-action',{liked:isLiked}]" aria-label="Yêu thích" @click="isLiked = !isLiked"><Heart :size="19" :fill="isLiked ? 'currentColor' : 'none'"/></button>
                  <a v-if="activeSong.audioUrl && activeSong.sourceType !== 'soundcloud'" class="sound-action" :href="activeSong.audioUrl" :download="`${activeSong.title}.mp3`" aria-label="Mở hoặc tải file nhạc"><Download :size="18"/></a>
                  </div>
                </div>
                <button class="sound-wave" aria-label="Tua bài hát" @click="setSeek"><span v-for="n in 100" :key="n" :class="['wave-bar',{played:n <= progress}]" :style="{height:`${12 + ((n * 29 + (n % 9) * 11) % 55)}px`}"/></button>
                <div class="sound-time"><span>{{ formatTime(currentTime) }}</span><span>{{ activeSong.duration || formatTime(duration) }}</span></div>
                <div class="sound-credits"><span><AudioLines :size="15"/> ĐANG PHÁT</span><span>{{ activeSong.album }}</span></div>
              </div>
            </div>
            <div v-else class="music-empty"><div class="empty-music-icon"><Music2 :size="29"/></div><h3>Thư viện đang chờ giai điệu của bạn</h3><p>Tải file nhạc lên để lưu vào Supabase và bắt đầu nghe.</p><button v-if="isAdmin" class="music-upload-button" @click="showUpload = true"><Upload :size="16"/> Chọn nhạc để tải lên</button></div>
            <section class="music-library">
              <div class="music-library-heading"><div><span>THƯ VIỆN CỦA BẠN</span><h3>Danh sách bài hát <b>{{ visibleSongs.length }}</b></h3></div><span class="library-note"><i></i> Chỉ hiển thị bài đã có file</span></div>
              <div v-if="visibleSongs.length" class="music-list" tabindex="0" role="region" aria-label="Danh sách bài hát, cuộn để xem thêm">
                <div v-for="(song,index) in visibleSongs" :key="song.id" :class="['music-list-row',{selected:activeSong?.id===song.id}]">
                  <span v-if="activeSong?.id===song.id && isPlaying" class="music-row-equalizer" role="img" aria-label="Đang phát"><i></i><i></i><i></i></span>
                  <span v-else class="music-row-index">{{ String(index + 1).padStart(2,'0') }}</span>
                  <SongArtwork class="music-row-cover" :song="song" />
                  <button class="music-row-title" @click="playSong(song)"><b>{{ song.title }}</b><small>{{ song.artist }}</small></button>
                  <span class="music-row-duration">{{ song.duration }}</span>
                  <button class="music-row-play" :aria-label="`${activeSong?.id===song.id && isPlaying ? 'Tạm dừng' : 'Phát'} ${song.title}`" @click="playSong(song)"><Pause v-if="activeSong?.id===song.id && isPlaying" :size="17" fill="currentColor"/><Play v-else :size="17" fill="currentColor"/></button>
                </div>
              </div>
              <div v-else class="empty-list">Chưa có bài hát nào được lưu. Hãy tải nhạc lên để thêm vào danh sách.</div>
            </section>
            <audio ref="audio" @timeupdate="currentTime = audio?.currentTime || 0" @loadedmetadata="handleLoadedMetadata" @play="isPlaying = true" @pause="isPlaying = false" @ended="handleEnded" />
          </section>

        </div>
        <aside class="legacy-right"><section class="legacy-panel"><h3>TÌM KIẾM</h3><div class="old-search"><input v-model="query" placeholder="Từ khóa..." @keyup.enter="searchMusic"/><button @click="searchMusic">Tìm kiếm</button></div></section><section class="legacy-panel"><h3>TIVI ONLINE</h3><div class="tv-grid"><button v-for="channel in ['VTV1','VTV2','VTV3','VTV4','VTV5','VTV5 TN','VTV6','VTV7 HD','VTV8','VTV9']" :key="channel" @click="showToast('Kênh ' + channel)"><b>{{ channel }}</b></button></div></section><section class="legacy-panel"><h3>GÓC TIN HỌC</h3><a v-for="item in ['Hướng dẫn làm blog','Tạo avatar Yahoo','Ký tự ALT đẹp','Mặt cười Yahoo','Bảng mã màu','Nick Yahoo độc','Chuyển đổi mã HTML']" :key="item" href="#music"><b>▸</b> {{ item }}</a></section><section class="legacy-panel poem-panel"><h3>THƠ VUI</h3><div class="legacy-link-list"><a v-for="poem in ['Cô Hàng Xóm','Thơ Bút Tre','Em Đi Lấy Chồng','Thơ Tình Toán Học','Thơ Tình Kế Toán','Thơ Lập Trình Viên','Bài Thơ Đôi Dép','BLOG của sao']" :key="poem" href="#top"><b>✿</b>{{ poem }}</a></div></section><section class="legacy-panel game-panel"><h3>GAME FLASH</h3><div class="legacy-game-list"><div v-for="game in [{name:'Happy Wheels',image:'happy-wheels'},{name:'Bartender The Right',image:'bartender'},{name:'Duck Life',image:'duck-life'},{name:'Escaping The Prison',image:'prison-escape'},{name:'Murder',image:'murder'},{name:'Jacksmith',image:'jacksmith'},{name:'Hardest Game',image:'hardest-game'},{name:'Bloons Tower Defense',image:'bloons-defense'},{name:'Super Smash Flash 2',image:'smash-flash'},{name:'Fireboy & Watergirl',image:'fireboy-watergirl'},{name:'Age of War',image:'age-of-war'},{name:'Run 3',image:'run-3'}]" :key="game.name" class="legacy-game-item"><img class="legacy-game-thumb" :src="`/images/games/${game.image}.jpg`" :alt="game.name" loading="lazy"/><span>{{ game.name }}</span></div></div></section><div class="right-sticker">✿<span>xuân<br/>đã về</span></div></aside>
      </div>
    </main>


    <Transition><div v-if="showUpload" class="modal-backdrop" @click.self="showUpload = false"><div class="upload-modal"><div class="modal-header"><div><span class="modal-eyebrow">THÊM VÀO THƯ VIỆN</span><h2>Thêm giai điệu</h2></div><button class="icon-button" aria-label="Đóng" @click="showUpload = false"><X :size="20"/></button></div><p class="modal-copy">Tải file lên máy chủ hoặc dán link để lưu bài hát vào Supabase.</p><div class="upload-mode-tabs"><button :class="{active:uploadMode==='file'}" @click="uploadMode='file';uploadError=''">Tải file</button><button :class="{active:uploadMode==='link'}" @click="uploadMode='link';uploadError=''">Dán link</button></div><label v-if="uploadMode==='file'" class="drop-zone"><input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac" @change="chooseFile"/><span class="drop-icon"><Upload :size="21"/></span><b>{{ selectedFile?.name || 'Chọn file nhạc từ thiết bị' }}</b><small>MP3, WAV, OGG, M4A · Tối đa 30 MB</small></label><label v-else class="field-label">LINK BÀI HÁT<input v-model="audioLink" type="url" placeholder="SoundCloud, YouTube, Spotify, Zing MP3 hoặc link file nhạc"/><small class="link-help">SoundCloud (kể cả link rút gọn), YouTube, Spotify, Zing MP3 và link file nhạc trực tiếp.</small><small v-if="metadataLoading" class="metadata-note">Đang tìm tên bài hát và ca sĩ…</small><small v-else-if="metadataNote" class="metadata-note">{{ metadataNote }}</small></label><label class="field-label">TÊN BÀI HÁT<input v-model="uploadTitle" type="text" placeholder="Tên bài hát (có thể sửa)"/></label><label class="field-label">CA SĨ<input v-model="uploadArtist" type="text" placeholder="Tên ca sĩ (có thể sửa)"/></label><p v-if="uploadError" class="upload-error">{{ uploadError }}</p><button class="submit-upload" :disabled="isUploading" @click="uploadMode==='file'?uploadSong():addSongLink()">{{ isUploading ? 'Đang xử lý...' : uploadMode==='file' ? 'Tải lên và phát' : 'Lưu link và phát' }} <ChevronRight :size="16"/></button></div></div></Transition>
    <Transition><div v-if="showEditSong" class="modal-backdrop" @click.self="showEditSong=false"><div class="upload-modal edit-song-modal"><div class="modal-header"><div><span class="modal-eyebrow">CHỈNH SỬA THƯ VIỆN</span><h2>Sửa bài hát</h2></div><button class="icon-button" aria-label="Đóng" @click="showEditSong=false"><X :size="20"/></button></div><p class="modal-copy">Sửa tên, ca sĩ hoặc thay link phát nhạc. Link mới sẽ được kiểm tra trước khi lưu.</p><label class="field-label">TÊN BÀI HÁT<input v-model="editingSong.title" type="text" placeholder="Tên bài hát"/></label><label class="field-label">CA SĨ<input v-model="editingSong.artist" type="text" placeholder="Tên ca sĩ"/></label><label class="field-label">LINK PHÁT NHẠC<input v-model="editingSong.audioUrl" type="url" placeholder="Link SoundCloud, YouTube, Spotify hoặc file nhạc"/><small class="link-help">Có thể thay link nguồn. File đã tải lên vẫn giữ đường dẫn cục bộ.</small></label><p v-if="editError" class="upload-error">{{ editError }}</p><button class="submit-upload" :disabled="isSavingEdit" @click="saveSongEdits">{{ isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi' }} <ChevronRight :size="16"/></button></div></div></Transition>
    <Transition><div v-if="toast" class="toast"><span>♪</span>{{ toast }}</div></Transition>
  </div>
</template>
