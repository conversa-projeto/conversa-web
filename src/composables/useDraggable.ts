import { ref } from 'vue'

export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null

export function useDraggable(
  initialX = window.innerWidth - 440,
  initialY = 16,
  initialW = 420,
  initialH = 350,
) {
  const x = ref(initialX)
  const y = ref(initialY)
  const width = ref(initialW)
  const height = ref(initialH)
  const isDragging = ref(false)
  const resizeEdge = ref<ResizeEdge>(null)

  const MIN_W = 320
  const MIN_H = 240

  let offsetX = 0
  let offsetY = 0
  let startX = 0
  let startY = 0
  let startW = 0
  let startH = 0
  let startLeft = 0
  let startTop = 0

  function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val))
  }

  // --- Drag ---
  function onPointerDown(e: PointerEvent) {
    isDragging.value = true
    offsetX = e.clientX - x.value
    offsetY = e.clientY - y.value
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  // --- Resize ---
  function onResizePointerDown(edge: NonNullable<ResizeEdge>, e: PointerEvent) {
    resizeEdge.value = edge
    startX = e.clientX
    startY = e.clientY
    startW = width.value
    startH = height.value
    startLeft = x.value
    startTop = y.value
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
  }

  // --- Shared move/up ---
  function onPointerMove(e: PointerEvent) {
    if (resizeEdge.value) {
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const edge = resizeEdge.value
      const maxW = window.innerWidth * 0.9
      const maxH = window.innerHeight * 0.9

      if (edge.includes('e')) {
        width.value = clamp(startW + dx, MIN_W, maxW)
      }
      if (edge.includes('w')) {
        const newW = clamp(startW - dx, MIN_W, maxW)
        x.value = startLeft + (startW - newW)
        width.value = newW
      }
      if (edge.includes('s')) {
        height.value = clamp(startH + dy, MIN_H, maxH)
      }
      if (edge.includes('n')) {
        const newH = clamp(startH - dy, MIN_H, maxH)
        y.value = startTop + (startH - newH)
        height.value = newH
      }
      return
    }

    if (!isDragging.value) return
    x.value = clamp(e.clientX - offsetX, 0, window.innerWidth - 100)
    y.value = clamp(e.clientY - offsetY, 0, window.innerHeight - 100)
  }

  function onPointerUp() {
    isDragging.value = false
    resizeEdge.value = null
  }

  return {
    x, y, width, height,
    isDragging, resizeEdge,
    onPointerDown, onPointerMove, onPointerUp,
    onResizePointerDown,
  }
}
