import { api } from '../lib/supabase'

const bucket = 'music'
type SongRow = { id: number; title: string; artist: string; album: string; duration: string; audio_url: string | null; cover: string; is_active: boolean }
const mapSong = (row: SongRow) => ({ id: row.id, title: row.title, artist: row.artist, album: row.album, duration: row.duration, audioUrl: row.audio_url, sourceType: sourceType(row.audio_url), cover: row.cover, isActive: row.is_active })
function sourceType(value: string | null) {
  if (!value) return 'audio'
  try {
    const host = new URL(value).hostname.toLowerCase()
    if (host.includes('soundcloud.com')) return 'soundcloud'
    if (host.includes('youtube.com') || host === 'youtu.be') return 'youtube'
    if (host.includes('spotify.com')) return 'spotify'
    if (host.includes('zingmp3.vn')) return 'zingmp3'
  } catch { /* Storage paths are treated as audio files. */ }
  return 'audio'
}
function providerDetails(url: string) {
  const kind = sourceType(url)
  const provider = ({ soundcloud: 'SoundCloud', youtube: 'YouTube', spotify: 'Spotify', zingmp3: 'Zing MP3' } as Record<string, string>)[kind]
  return { kind, album: provider ? `Phát từ ${provider}` : 'Link âm thanh', cover: kind === 'soundcloud' ? '☁' : kind === 'youtube' ? '▶' : kind === 'audio' ? '🎧' : '♫' }
}
async function listSongs(all = false) {
  let query = api().from('songs').select('*').order('created_at', { ascending: false })
  if (!all) query = query.eq('is_active', true).not('audio_url', 'is', null)
  const { data, error } = await query
  if (error) throw error
  return (data as SongRow[]).map(mapSong)
}
export async function getSongs() { return listSongs() }
export async function getManagedSongs() { return (await listSongs(true)).filter(song => song.audioUrl) }
export async function saveSong(input: { title: string; artist: string; audioUrl: string; duration?: string; cover?: string }) {
  const details = providerDetails(input.audioUrl)
  const { data, error } = await api().from('songs').insert({ title: input.title.trim(), artist: input.artist.trim() || 'Nghệ sĩ chưa rõ', album: details.album, audio_url: input.audioUrl, cover: input.cover || details.cover, duration: input.duration || '--:--' }).select().single()
  if (error) throw error
  return mapSong(data as SongRow)
}
export async function uploadSong(file: File, title: string, artist: string) {
  const client = api()
  const safeName = file.name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'audio'
  const path = `${crypto.randomUUID()}/${safeName}`
  const { error: uploadError } = await client.storage.from(bucket).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (uploadError) throw uploadError
  const { data } = client.storage.from(bucket).getPublicUrl(path)
  try { return await saveSong({ title, artist, audioUrl: data.publicUrl }) }
  catch (error) { await client.storage.from(bucket).remove([path]); throw error }
}
export async function updateSong(id: number, input: { title: string; artist: string; audioUrl: string }) {
  const details = providerDetails(input.audioUrl)
  const { data, error } = await api().from('songs').update({ title: input.title.trim(), artist: input.artist.trim() || 'Nghệ sĩ chưa rõ', audio_url: input.audioUrl, album: details.album, cover: details.cover }).eq('id', id).select().single()
  if (error) throw error
  return mapSong(data as SongRow)
}
export async function setSongActive(id: number, isActive: boolean) {
  const { error } = await api().from('songs').update({ is_active: isActive }).eq('id', id)
  if (error) throw error
}
export async function deleteSong(id: number) {
  const client = api()
  const { data, error } = await client.from('songs').select('audio_url').eq('id', id).single()
  if (error) throw error
  const { error: deleteError } = await client.from('songs').delete().eq('id', id)
  if (deleteError) throw deleteError
  const url = data.audio_url as string | null
  if (url) {
    try {
      const path = new URL(url).pathname.split(`/storage/v1/object/public/${bucket}/`)[1]
      if (path) await client.storage.from(bucket).remove([decodeURIComponent(path)])
    } catch { /* External audio links have no Storage object to remove. */ }
  }
}
export async function getPlaylists() {
  const { data, error } = await api().from('playlists').select('id,name,cover').order('id')
  if (error) throw error
  return data || []
}
