export type LinkMetadata = { title: string; artist: string }

const knownHosts = new Set([
  'soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com', 'on.soundcloud.com',
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be',
  'open.spotify.com', 'www.open.spotify.com', 'spotify.link',
  'zingmp3.vn', 'www.zingmp3.vn', 'mp3.zing.vn',
])

function clean(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

export async function getMusicLinkMetadata(rawUrl: string): Promise<LinkMetadata> {
  const url = new URL(rawUrl)
  if (!['http:', 'https:'].includes(url.protocol) || !knownHosts.has(url.hostname.toLowerCase())) {
    const extension = url.pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase()
    if (extension && ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'webm'].includes(extension)) {
      return { title: decodeURIComponent(url.pathname.split('/').at(-1) || '').replace(/\.[^.]+$/, '').replace(/[._-]+/g, ' ').trim(), artist: '' }
    }
    return { title: '', artist: '' }
  }

  const host = url.hostname.toLowerCase()
  let endpoint = ''
  if (host.includes('soundcloud.com')) endpoint = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url.href)}`
  else if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.href)}`
  else if (host.includes('spotify.com') || host === 'spotify.link') endpoint = `https://open.spotify.com/oembed?url=${encodeURIComponent(url.href)}`
  else if (host.includes('zingmp3.vn') || host === 'mp3.zing.vn') {
    // Zing MP3 does not expose a documented browser metadata API. Its public
    // Open Graph tags may be readable where the host permits cross-origin GETs.
    const response = await fetch(url.href, { signal: AbortSignal.timeout(7000) })
    if (!response.ok) return { title: '', artist: '' }
    const html = await response.text()
    const readMeta = (key: string) => {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const tags = html.match(/<meta\b[^>]*>/gi) || []
      const tag = tags.find(item => new RegExp(`(?:property|name)=["']${escaped}["']`, 'i').test(item))
      return clean(tag?.match(/content=["']([^"']*)["']/i)?.[1])
    }
    return {
      title: (readMeta('og:title') || readMeta('twitter:title')).replace(/\s*[-|·]\s*Zing MP3\s*$/i, ''),
      artist: readMeta('music:musician') || readMeta('og:audio:artist'),
    }
  }

  if (!endpoint) return { title: '', artist: '' }
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(7000) })
  if (!response.ok) return { title: '', artist: '' }
  const data = await response.json() as { title?: unknown; author_name?: unknown }
  return { title: clean(data.title), artist: clean(data.author_name) }
}
