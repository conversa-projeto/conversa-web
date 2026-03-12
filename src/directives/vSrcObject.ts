import type { Directive } from 'vue'

function bindAndPlay(el: HTMLMediaElement, stream: MediaStream | null) {
  if (!stream) {
    el.srcObject = null
    return
  }
  if (el.srcObject === stream) return

  el.srcObject = stream
  el.play().catch((err) => {
    if (err.name === 'NotAllowedError') {
      // Popup windows may not have user interaction.
      // Play muted first, then unmute to bypass autoplay policy.
      const wasMuted = el.muted
      el.muted = true
      el.play().then(() => {
        el.muted = wasMuted
      }).catch(() => { /* ignore */ })
    } else {
      console.warn('Media play failed:', err)
    }
  })
}

export const vSrcObject: Directive<HTMLMediaElement, MediaStream | null> = {
  mounted(el, binding) {
    bindAndPlay(el, binding.value)
  },
  updated(el, binding) {
    bindAndPlay(el, binding.value)
  },
  unmounted(el) {
    el.srcObject = null
  }
}
