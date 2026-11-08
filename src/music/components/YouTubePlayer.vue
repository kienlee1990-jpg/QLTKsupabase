<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { connectYouTubePlayer, loadYouTubeApi } from '../youtubePlayer.js'

defineProps({ src: { type: String, required: true }, title: String })
const emit = defineEmits(['playing', 'duration', 'time', 'ended', 'error'])
const frame = ref(null)
let controller
let disposed = false
onMounted(async () => {
  try {
    const YT = await loadYouTubeApi()
    if (disposed) return
    controller = connectYouTubePlayer(YT, frame.value, {
      playing: value => emit('playing', value),
      duration: value => emit('duration', value),
      time: value => emit('time', value),
      ended: () => emit('ended'),
      error: message => emit('error', message),
    })
  } catch (error) {
    if (!disposed) emit('error', error.message)
  }
})
onBeforeUnmount(() => {
  disposed = true
  controller?.destroy()
  emit('playing', false)
})
defineExpose({ toggle: () => controller?.toggle() || false, restart: () => controller?.restart() })
</script>

<template>
  <iframe ref="frame" class="soundcloud-embed" :src="src" :title="title"
    allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture"
    allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
</template>
