<script setup>
import { ref, watch } from 'vue'

const props = defineProps({ song: { type: Object, required: true } })
const artwork = ref('')
const fallback = '/images/song-artwork.svg'
// Share requests when a song appears more than once; URLs also invalidate
// cached artwork naturally when a saved link changes.
const cache = artworkCache
let requestId = 0
watch(() => [props.song.audioUrl, props.song.cover], async () => {
  const request = ++requestId
  artwork.value = ''
  const cover = props.song.cover
  if (typeof cover === 'string' && (/^https:\/\//.test(cover) || /^\/(?!\/)/.test(cover))) {
    artwork.value = cover
    return
  }
  try {
    const url = new URL(props.song.audioUrl)
    const host = url.hostname.toLowerCase()
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(host)) {
      const parts = url.pathname.split('/').filter(Boolean)
      const id = host === 'youtu.be' ? parts[0] : url.searchParams.get('v') || (['embed', 'shorts', 'live', 'v'].includes(parts[0]) ? parts[1] : '')
      if (/^[\w-]{11}$/.test(id || '')) artwork.value = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
      return
    }
    if (!['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com', 'on.soundcloud.com'].includes(host)) return
    if (!cache.has(url.href)) {
      const endpoint = new URL('https://soundcloud.com/oembed')
      endpoint.search = new URLSearchParams({ format: 'json', url: url.href }).toString()
      const pending = fetch(endpoint, { signal: AbortSignal.timeout(8000) })
        .then(response => response.ok ? response.json() : null)
        .then(data => typeof data?.thumbnail_url === 'string' && data.thumbnail_url.startsWith('https://') && !data.thumbnail_url.includes('/images/fb_placeholder.png') ? data.thumbnail_url : '')
        .catch(() => { cache.delete(url.href); return '' })
      cache.set(url.href, pending)
    }
    const thumbnail = await cache.get(url.href)
    if (request === requestId) artwork.value = thumbnail
  } catch { /* Local files and unavailable artwork use the record sleeve. */ }
}, { immediate: true })
</script>

<script>
const artworkCache = new Map()
</script>

<template>
  <span class="song-artwork">
    <img :src="artwork || fallback" :alt="`Ảnh bìa ${song.title} — ${song.artist}`" loading="lazy" decoding="async" @error="artwork = ''" />
  </span>
</template>

<style scoped>
.song-artwork{display:block;overflow:hidden;border-radius:5px;background:#e4e9db;box-shadow:0 1px 3px #283b2026}
.song-artwork img{display:block;width:100%;height:100%;object-fit:cover}
</style>
