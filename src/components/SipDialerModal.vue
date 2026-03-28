<template>
  <div
    v-if="aberta"
    class="fixed z-50 w-72"
    :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
  >
    <div class="overflow-hidden rounded-3xl bg-surface-base shadow-2xl ring-1 ring-surface-200">
      <div
        class="flex items-center justify-between border-b border-surface-200 px-4 py-2.5 select-none"
        @pointerdown="iniciarArrasto"
        @pointermove="moverArrasto"
        @pointerup="finalizarArrasto"
        @pointercancel="finalizarArrasto"
      >
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-[0.22em] text-surface-500">Ramal</p>
          <h2 class="text-sm font-semibold text-surface-900">{{ sip.sipConfig?.sip_user || 'Indisponivel' }}</h2>
        </div>
        <button class="flex h-7 w-7 items-center justify-center rounded-full text-base text-surface-500 transition hover:bg-surface-200 hover:text-surface-800" @pointerdown.stop @click="emit('close')">&times;</button>
      </div>

      <div class="space-y-3 px-4 py-3">
        <div class="flex items-center justify-between rounded-xl bg-surface-50 px-3 py-2">
          <div>
            <p class="text-[10px] uppercase tracking-wide text-surface-500">Status do ramal</p>
            <p class="text-xs font-semibold" :class="statusClasse">{{ statusTexto }}</p>
          </div>
          <span class="h-2.5 w-2.5 rounded-full" :class="statusBadgeClasse"></span>
        </div>

        <div v-if="sip.erro" class="rounded-xl bg-danger-50 dark:bg-danger-900 px-3 py-2 text-sm text-danger-700 dark:text-danger-400">{{ sip.erro }}</div>

        <div class="flex items-center gap-2 rounded-xl border border-surface-300 px-3 py-2 focus-within:border-primary-500">
          <input
            v-model="numero"
            type="text"
            inputmode="tel"
            class="min-w-0 flex-1 bg-transparent text-center text-xl tracking-[0.18em] text-surface-900 outline-none"
            placeholder="Digite o numero"
          />
          <button
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-surface-500 transition hover:bg-surface-200 hover:text-surface-900 disabled:opacity-50"
            :disabled="!numero"
            @click="apagarUltimoDigito"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12.75 9.75 15 12m0 0 2.25 2.25M15 12l2.25-2.25M15 12l-2.25 2.25M3 12l6.414-8.414A2 2 0 0 1 10.828 3H19.5A1.5 1.5 0 0 1 21 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-8.672a2 2 0 0 1-1.414-.586L3 12Z" />
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-3 gap-1.5">
          <button
            v-for="tecla in teclas"
            :key="tecla.valor"
            type="button"
            class="rounded-xl border border-surface-200 bg-surface-base px-2 py-2.5 text-center transition hover:border-primary-300 hover:bg-surface-200"
            @click="pressionarTecla(tecla.valor)"
          >
            <span class="block text-base font-semibold text-surface-900">{{ tecla.valor }}</span>
            <span class="block text-[9px] uppercase tracking-[0.2em] text-surface-400">{{ tecla.subtitulo }}</span>
          </button>
        </div>

        <!-- Discando -->
        <div v-if="sip.discando" class="rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 text-center">
          <div class="flex items-center justify-center gap-1">
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500 [animation-delay:-0.3s]"></span>
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500 [animation-delay:-0.15s]"></span>
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500"></span>
          </div>
          <p class="mt-1 text-xs font-semibold text-surface-800">Discando...</p>
          <p class="text-[10px] text-surface-500">{{ chamadaDestino }}</p>
        </div>

        <!-- Chamada em andamento -->
        <div v-else-if="sip.chamadaEmAndamento" class="rounded-xl border border-surface-200 bg-surface-50 px-3 py-2">
          <p class="text-xs font-semibold text-success-700 dark:text-success-400">Chamada em andamento</p>
          <p class="text-[10px] text-surface-500">{{ chamadaDestino }}</p>
        </div>

        <div class="flex items-center gap-2">
          <!-- Ligar -->
          <button
            v-if="!sip.chamadaEmAndamento && !sip.discando"
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-success-700 disabled:opacity-60"
            :disabled="!podeLigar || sip.processandoConexao"
            @click="iniciarDiscagem"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 7.318 5.932 13.25 13.25 13.25h1.5a2.25 2.25 0 0 0 2.244-2.077l.245-2.72a1.5 1.5 0 0 0-1.345-1.63l-2.902-.322a1.5 1.5 0 0 0-1.473.805l-.813 1.466a10.5 10.5 0 0 1-4.674-4.674l1.466-.813a1.5 1.5 0 0 0 .805-1.473l-.322-2.902a1.5 1.5 0 0 0-1.63-1.345l-2.72.245A2.25 2.25 0 0 0 2.25 6.75Z" />
            </svg>
            {{ sip.processandoConexao ? 'Conectando...' : 'Ligar' }}
          </button>

          <!-- Cancelar enquanto discando -->
          <button
            v-else-if="sip.discando"
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-danger-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-danger-700"
            @click="encerrarChamadaAtual"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 9.75c3.75-1.5 9.75-1.5 13.5 0m-13.5 0a18.439 18.439 0 0 0-1.318 4.849A1.5 1.5 0 0 0 5.426 16.5h.258c.398 0 .779-.158 1.06-.439l1.283-1.282a1.5 1.5 0 0 1 1.06-.44h5.826c.398 0 .779.158 1.06.44l1.283 1.282c.281.281.662.439 1.06.439h.258a1.5 1.5 0 0 0 1.494-1.901A18.438 18.438 0 0 0 18.75 9.75m-13.5 0 .963-2.89A1.875 1.875 0 0 1 7.994 5.625h8.012c.807 0 1.523.516 1.781 1.235l.963 2.89" />
            </svg>
            Cancelar
          </button>

          <template v-else>
            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-200 transition hover:bg-surface-200"
              :class="sip.mutado ? 'bg-warning-100 border-warning-300 dark:bg-warning-900/40 dark:border-warning-700' : ''"
              @click="sip.mutado ? sip.desmutar() : sip.mutar()"
            >
              <svg v-if="!sip.mutado" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 text-surface-700">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 text-warning-600 dark:text-warning-400">
                <path stroke-linecap="round" stroke-linejoin="round" d="m3 3 18 18M12 18.75a6 6 0 0 0 5.854-4.682M9.537 8.463A3 3 0 0 0 9 10.5v2.25a3 3 0 0 0 5.463 1.537M15 10.5V6a3 3 0 0 0-6 0v.75M12 18.75v3.75m-3.75 0h7.5M6 12.75v-1.5" />
              </svg>
            </button>

            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-danger-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-danger-700"
              @click="encerrarChamadaAtual"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 9.75c3.75-1.5 9.75-1.5 13.5 0m-13.5 0a18.439 18.439 0 0 0-1.318 4.849A1.5 1.5 0 0 0 5.426 16.5h.258c.398 0 .779-.158 1.06-.439l1.283-1.282a1.5 1.5 0 0 1 1.06-.44h5.826c.398 0 .779.158 1.06.44l1.283 1.282c.281.281.662.439 1.06.439h.258a1.5 1.5 0 0 0 1.494-1.901A18.438 18.438 0 0 0 18.75 9.75m-13.5 0 .963-2.89A1.875 1.875 0 0 1 7.994 5.625h8.012c.807 0 1.523.516 1.781 1.235l.963 2.89" />
              </svg>
              Encerrar chamada
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSipStore } from '../stores/sip'

const dtmfFreqs: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
}
let audioCtx: AudioContext | null = null

function tocarTomDtmf(valor: string) {
  const freqs = dtmfFreqs[valor]
  if (!freqs) return
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext()
    }
    const ctx = audioCtx
    const duracao = 0.1
    const ganho = ctx.createGain()
    ganho.gain.setValueAtTime(0.3, ctx.currentTime)
    ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracao)
    ganho.connect(ctx.destination)
    for (const freq of freqs) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(ganho)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duracao)
    }
  } catch {
    // ignora erros de AudioContext
  }
}

const props = defineProps<{
  aberta: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const teclas = [
  { valor: '1', subtitulo: '' },
  { valor: '2', subtitulo: 'ABC' },
  { valor: '3', subtitulo: 'DEF' },
  { valor: '4', subtitulo: 'GHI' },
  { valor: '5', subtitulo: 'JKL' },
  { valor: '6', subtitulo: 'MNO' },
  { valor: '7', subtitulo: 'PQRS' },
  { valor: '8', subtitulo: 'TUV' },
  { valor: '9', subtitulo: 'WXYZ' },
  { valor: '*', subtitulo: '' },
  { valor: '0', subtitulo: '+' },
  { valor: '#', subtitulo: '' },
]

const sip = useSipStore()
const numero = ref('')

const pos = ref({ x: 0, y: 0 })
let arrastando = false
let offsetX = 0
let offsetY = 0

watch(() => sip.chamadaEmAndamento, (emAndamento) => {
  if (!emAndamento) numero.value = ''
})

watch(() => props.aberta, (aberta) => {
  if (aberta) {
    pos.value = {
      x: Math.max(8, (window.innerWidth - 288) / 2),
      y: Math.max(8, (window.innerHeight - 520) / 2),
    }
  }
})

function iniciarArrasto(e: PointerEvent) {
  arrastando = true
  offsetX = e.clientX - pos.value.x
  offsetY = e.clientY - pos.value.y
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function moverArrasto(e: PointerEvent) {
  if (!arrastando) return
  pos.value = {
    x: Math.max(0, Math.min(window.innerWidth - 288, e.clientX - offsetX)),
    y: Math.max(0, Math.min(window.innerHeight - 48, e.clientY - offsetY)),
  }
}

function finalizarArrasto(e: PointerEvent) {
  arrastando = false
  ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
}

const statusTexto = computed(() => {
  if (!sip.sipConfig) return 'Sem configuracao'
  if (!sip.sipDisponivel) return 'Ramal inativo'
  if (sip.isRegistered) return 'Registrado'
  if (sip.isConnecting || sip.processandoConexao) return 'Conectando'
  if (sip.isConnected) return 'Conectado sem registro'
  if (sip.erro) return 'Falha na conexao'
  return 'Desconectado'
})

const statusClasse = computed(() => {
  if (!sip.sipDisponivel) return 'text-surface-700'
  if (sip.isRegistered) return 'text-success-700 dark:text-success-400'
  if (sip.isConnecting || sip.processandoConexao) return 'text-warning-700 dark:text-warning-400'
  if (sip.erro) return 'text-danger-700 dark:text-danger-400'
  return 'text-surface-700'
})

const statusBadgeClasse = computed(() => {
  if (!sip.sipDisponivel) return 'bg-surface-300'
  if (sip.isRegistered) return 'bg-success-500'
  if (sip.isConnecting || sip.processandoConexao) return 'bg-warning-400'
  if (sip.erro) return 'bg-danger-500'
  return 'bg-surface-300'
})

const destinoFormatado = computed(() => {
  if (!numero.value) return 'sip:numero@dominio'
  const dominio = sip.sipConfig?.domain || 'dominio'
  return `sip:${numero.value}@${dominio}`
})

const chamadaDestino = computed(() => sip.chamadaDestinoUri || destinoFormatado.value)
const podeLigar = computed(() => !!numero.value.trim() && sip.sipDisponivel)

function pressionarTecla(valor: string) {
  sip.limparErro()
  tocarTomDtmf(valor)
  if (sip.chamadaEmAndamento) {
    void enviarDtmf(valor)
    return
  }
  numero.value += valor
}

async function enviarDtmf(valor: string) {
  try {
    await sip.enviarDtmf(valor)
  } catch (e) {
    sip.erro = e instanceof Error ? e.message : 'Nao foi possivel enviar DTMF.'
  }
}

function apagarUltimoDigito() {
  numero.value = numero.value.slice(0, -1)
}

async function iniciarDiscagem() {
  if (!podeLigar.value) return
  sip.limparErro()

  try {
    await sip.discar(numero.value)
  } catch (e) {
    sip.erro = e instanceof Error ? e.message : 'Nao foi possivel iniciar a discagem.'
  }
}

async function encerrarChamadaAtual() {
  sip.limparErro()
  try {
    await sip.encerrarChamada()
  } catch (e) {
    sip.erro = e instanceof Error ? e.message : 'Nao foi possivel encerrar a chamada.'
  }
}
</script>

