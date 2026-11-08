<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { ChevronLeft, ChevronRight, Pause, Play } from '@lucide/vue'

const photos = [
  { src: '/images/slideshow/memory-01.jpg', alt: 'Kỷ niệm bên cây thông và đài phun nước' },
  { src: '/images/slideshow/memory-02.jpg', alt: 'Dạo chơi bên bờ sông dưới trời xanh' },
  { src: '/images/slideshow/memory-03.jpg', alt: 'Khoảnh khắc Giáng sinh bên cây thông trang trí' },
  { src: '/images/slideshow/memory-04.jpg', alt: 'Hoàng hôn bên sông' },
  { src: '/images/slideshow/memory-05.jpg', alt: 'Chiếc ô trong suốt bên giàn hoa trắng' },
  { src: '/images/slideshow/memory-06.jpg', alt: 'Kỷ niệm bên vòng quay ngựa gỗ' },
  { src: '/images/slideshow/memory-07.jpg', alt: 'Buổi tối trước quán Giihan' },
]
const current = ref(0)
const paused = ref(false)
const hovering = ref(false)
const focused = ref(false)
let timer
function selectSlide(index) {
  current.value = (index + photos.length) % photos.length
  restartTimer()
}
function restartTimer() {
  clearInterval(timer)
  timer = setInterval(() => {
    if (!paused.value && !hovering.value && !focused.value && !document.hidden) {
      current.value = (current.value + 1) % photos.length
    }
  }, 5000)
}
function leaveFocus(event) {
  focused.value = event.currentTarget.contains(event.relatedTarget)
}
onMounted(() => {
  paused.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  restartTimer()
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <section class="welcome-slideshow" aria-label="Ảnh kỷ niệm" aria-roledescription="trình chiếu"
    @mouseenter="hovering = true" @mouseleave="hovering = false"
    @focusin="focused = true" @focusout="leaveFocus"
    @keydown.left.prevent="selectSlide(current - 1)" @keydown.right.prevent="selectSlide(current + 1)">
    <h2>WELCOME TO XUANDIEUCLUB.TK</h2>
    <div class="welcome-stage">
      <div class="welcome-slides" :style="{ transform: `translateX(-${current * 100}%)` }">
        <div v-for="(photo, index) in photos" :key="photo.src" class="welcome-slide"
          role="group" aria-roledescription="trang ảnh" :aria-label="`${index + 1} / ${photos.length}`" :aria-hidden="index !== current">
          <img :src="photo.src" :alt="photo.alt" draggable="false" />
          <img class="welcome-companion" :src="photos[(index + 1) % photos.length].src" :alt="photos[(index + 1) % photos.length].alt" draggable="false" />
        </div>
      </div>
      <div class="welcome-caption">Welcome to XuandieuClub.TK <small>{{ current + 1 }} / {{ photos.length }}</small></div>
      <button class="welcome-arrow welcome-prev" aria-label="Ảnh trước" @click="selectSlide(current - 1)"><ChevronLeft :size="30" /></button>
      <button class="welcome-arrow welcome-next" aria-label="Ảnh tiếp theo" @click="selectSlide(current + 1)"><ChevronRight :size="30" /></button>
    </div>
    <div class="welcome-controls">
      <div class="welcome-dots" aria-label="Chọn ảnh">
        <button v-for="(photo, index) in photos" :key="photo.src" :class="{ active: current === index }"
          :aria-label="`Xem ảnh ${index + 1}`" :aria-current="current === index ? 'true' : undefined" @click="selectSlide(index)"><span /></button>
      </div>
      <button class="welcome-autoplay" :aria-label="paused ? 'Tự động chuyển ảnh' : 'Tạm dừng chuyển ảnh'" :title="paused ? 'Tự động chuyển ảnh' : 'Tạm dừng chuyển ảnh'" @click="paused = !paused">
        <Play v-if="paused" :size="14" /><Pause v-else :size="14" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.welcome-slideshow{min-width:0;margin-bottom:12px;border:1px solid #78c82c;background:#fff;font-family:Arial,sans-serif}
.welcome-slideshow h2{margin:0;padding:12px 6px;background:#f3fae9;border-bottom:3px solid #78c82c;text-align:center;color:#081add;font:bold clamp(12px,1.25vw,18px) Arial,sans-serif;overflow-wrap:anywhere}
.welcome-stage{position:relative;overflow:hidden;margin:8px 2px 0;aspect-ratio:1.95;background:#eee7e4}
.welcome-slides{display:flex;height:100%;transition:transform .6s ease}
.welcome-slide{display:grid;grid-template-columns:1fr 1fr;gap:2px;flex:0 0 100%;min-width:0;height:100%}
.welcome-slide img{display:block;width:100%;height:100%;min-height:0;min-width:0;object-fit:cover;object-position:50% 32%}
.welcome-caption{position:absolute;inset:auto 0 0;padding:20px 12px 12px;background:linear-gradient(transparent,#0009);color:white;font-size:clamp(11px,1.4vw,20px);display:flex;align-items:center;justify-content:space-between;gap:5px;pointer-events:none}
.welcome-caption small{font-size:10px;white-space:nowrap}
.welcome-arrow{position:absolute;top:50%;transform:translateY(-50%);display:grid;place-items:center;min-width:36px;min-height:44px;border:0;border-radius:3px;background:#0003;color:white;padding:0}
.welcome-arrow:hover{background:#0008}.welcome-prev{left:6px}.welcome-next{right:6px}
.welcome-controls{position:relative;display:flex;align-items:center;justify-content:center;min-height:48px;padding:0 38px}
.welcome-dots{display:flex;flex:1;max-width:210px;min-width:0;justify-content:center;gap:0}
.welcome-dots button{display:grid;place-items:center;flex:1;max-width:28px;min-width:0;height:36px;background:none;border:0;padding:0}
.welcome-dots span{width:11px;height:11px;border-radius:50%;background:#bfbfbf}.welcome-dots .active span{background:#6c6c6c}
.welcome-autoplay{position:absolute;right:7px;display:grid;place-items:center;width:30px;height:30px;border:1px solid #e0e7d9;background:#f3fae9;color:#527831;border-radius:3px}
@media(max-width:760px){
  .welcome-slideshow{margin-bottom:6px}.welcome-slideshow h2{padding:9px 4px;font-size:11px}
  .welcome-stage{aspect-ratio:1 / 1.05;margin-top:4px}.welcome-slide{grid-template-columns:1fr}.welcome-companion{display:none!important}
  .welcome-caption{padding:20px 7px 9px;font-size:11px}.welcome-arrow{min-width:28px;min-height:40px}.welcome-arrow svg{width:23px}
  .welcome-prev{left:3px}.welcome-next{right:3px}.welcome-controls{min-height:40px}
}
@media(prefers-reduced-motion:reduce){.welcome-slides{transition:none}}
</style>
