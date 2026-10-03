<template>
  <div
    ref="alvo"
    class="shrink-0"
    :style="{ width: `${tamanho}px`, height: `${tamanho}px` }"
    role="img"
    :aria-label="nomeFigurinha(id)"
    :title="nomeFigurinha(id)"
  >
    <span
      v-if="falhou"
      class="flex h-full w-full items-center justify-center rounded-xl bg-surface-200 text-xs text-surface-500"
    >Figurinha</span>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AnimationItem } from 'lottie-web'
import { carregarAnimacaoFigurinha, carregarPlayerLottie, nomeFigurinha } from '../utils/figurinhas'

const props = withDefaults(defineProps<{
  id: string
  tamanho?: number
}>(), {
  tamanho: 160,
})

const alvo = ref<HTMLElement | null>(null)
const falhou = ref(false)
let animacao: AnimationItem | null = null
let visivel = true
let desmontado = false
let observador: IntersectionObserver | null = null
const movimentoReduzido = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Toca só enquanto aparece na tela; com movimento reduzido, fica parada
function atualizarReproducao() {
  if (!animacao) return
  if (visivel && !movimentoReduzido) animacao.play()
  else animacao.pause()
}

async function montar() {
  animacao?.destroy()
  animacao = null
  falhou.value = false
  const id = props.id
  try {
    const [lottie, dados] = await Promise.all([carregarPlayerLottie(), carregarAnimacaoFigurinha(id)])
    if (desmontado || !alvo.value || id !== props.id) return
    animacao = lottie.loadAnimation({
      container: alvo.value,
      renderer: 'svg',
      loop: true,
      autoplay: false,
      // O player altera os dados que recebe: cada figurinha usa uma cópia
      animationData: structuredClone(dados),
    })
    if (movimentoReduzido) animacao.goToAndStop(animacao.totalFrames / 2, true)
    atualizarReproducao()
  } catch {
    if (!desmontado) falhou.value = true
  }
}

watch(() => props.id, () => { void montar() })

onMounted(() => {
  if (typeof IntersectionObserver !== 'undefined' && alvo.value) {
    observador = new IntersectionObserver(([entrada]) => {
      visivel = !!entrada?.isIntersecting
      atualizarReproducao()
    })
    observador.observe(alvo.value)
  }
  void montar()
})

onBeforeUnmount(() => {
  desmontado = true
  observador?.disconnect()
  animacao?.destroy()
})
</script>
