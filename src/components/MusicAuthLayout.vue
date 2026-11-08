<template>
  <div class="music-auth-layout">
    <section class="music-auth-story">
      <RouterLink class="music-auth-brand" to="/" aria-label="Giai Điệu Thanh Xuân — trang chủ">
        <span class="music-auth-brand-mark"><Music2 :size="22" /></span>
        <span>Giai Điệu<small>THANH XUÂN</small></span>
      </RouterLink>
      <div class="music-auth-copy">
        <span class="music-auth-kicker"><i></i> ÂM NHẠC · KỶ NIỆM · BẠN BÈ</span>
        <h1>Một giai điệu,<br /><em>ngàn ký ức.</em></h1>
        <p>Lưu lại những bài hát bạn yêu thích<br />và nghe lại bất cứ khi nào muốn.</p>
        <div class="music-auth-record" aria-hidden="true">
          <div class="music-auth-vinyl"><span><Music2 :size="26" /></span></div>
          <i class="record-spark spark-one">✳</i><i class="record-spark spark-two">✦</i>
          <small>GIAI ĐIỆU CỦA THANH XUÂN</small>
        </div>
      </div>
      <span class="music-auth-footer">Nghe nhạc · Giữ kỷ niệm · Chia sẻ yêu thương</span>
    </section>
    <main class="music-auth-main"><RouterView /></main>
  </div>
</template>

<script setup lang="ts">
import { Music2 } from '@lucide/vue'
</script>
