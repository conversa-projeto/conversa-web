import type { Directive } from 'vue'

export const vSrcObject: Directive<HTMLMediaElement, MediaStream | null> = {
  mounted(el, binding) {
    if (binding.value) el.srcObject = binding.value
  },
  updated(el, binding) {
    if (el.srcObject !== binding.value) el.srcObject = binding.value
  }
}
