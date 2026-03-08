import type { Directive } from 'vue'

function bindAndPlay(el: HTMLMediaElement, stream: MediaStream | null) {
  if (!stream) return
  if (el.srcObject !== stream) {
    el.srcObject = stream
  }

  const playPromise = el.play()
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      // Ignore autoplay policy rejections.
    })
  }
}

export const vSrcObject: Directive<HTMLMediaElement, MediaStream | null> = {
  mounted(el, binding) {
    bindAndPlay(el, binding.value)
  },
  updated(el, binding) {
    bindAndPlay(el, binding.value)
  }
}