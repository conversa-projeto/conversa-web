<template>
  <div v-if="aberta" class="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/50 p-4">
    <div class="w-full max-w-md overflow-hidden rounded-3xl bg-surface-base shadow-2xl">
      <div class="flex items-start justify-between border-b border-surface-200 px-5 py-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-surface-500">Ramal</p>
          <h2 class="mt-1 text-lg font-semibold text-surface-900">{{ sip.sipConfig?.sip_user || 'Indisponivel' }}</h2>
        </div>
        <button class="flex h-10 w-10 items-center justify-center rounded-full text-lg text-surface-500 transition hover:bg-surface-200 hover:text-surface-800" @click="emit('close')">&times;</button>
      </div>

      <div class="space-y-5 px-5 py-5">
        <div class="flex items-center justify-between rounded-2xl bg-surface-50 px-4 py-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-surface-500">Status do ramal</p>
            <p class="mt-1 text-sm font-semibold" :class="statusClasse">{{ statusTexto }}</p>
          </div>
          <span class="h-3 w-3 rounded-full" :class="statusBadgeClasse"></span>
        </div>

        <div v-if="sip.erro" class="rounded-xl bg-danger-50 dark:bg-danger-900 px-3 py-2 text-sm text-danger-700 dark:text-danger-400">{{ sip.erro }}</div>

        <div class="rounded-2xl border border-surface-200 p-4">
          <label class="mb-2 block text-sm font-medium text-surface-700">Numero para discagem</label>
          <div class="flex items-center gap-3 rounded-2xl border border-surface-300 px-4 py-3 focus-within:border-primary-500">
            <input
              v-model="numero"
              type="text"
              inputmode="tel"
              class="min-w-0 flex-1 bg-transparent text-center text-2xl tracking-[0.18em] text-surface-900 outline-none text-surface-800"
              placeholder="Digite o numero"
            />
            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-surface-500 transition hover:bg-surface-200 hover:text-surface-900 disabled:opacity-50"
              :disabled="!numero"
              @click="apagarUltimoDigito"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12.75 9.75 15 12m0 0 2.25 2.25M15 12l2.25-2.25M15 12l-2.25 2.25M3 12l6.414-8.414A2 2 0 0 1 10.828 3H19.5A1.5 1.5 0 0 1 21 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-8.672a2 2 0 0 1-1.414-.586L3 12Z" />
              </svg>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="tecla in teclas"
            :key="tecla.valor"
            type="button"
            class="rounded-2xl border border-surface-200 bg-surface-base px-3 py-4 text-center shadow-sm transition hover:border-primary-300 hover:bg-surface-200"
            @click="pressionarTecla(tecla.valor)"
          >
            <span class="block text-2xl font-semibold text-surface-900">{{ tecla.valor }}</span>
            <span class="mt-1 block text-[11px] uppercase tracking-[0.24em] text-surface-400">{{ tecla.subtitulo }}</span>
          </button>
        </div>

        <div v-if="sip.chamadaEmAndamento" class="rounded-2xl border border-primary-100 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/30 px-4 py-3">
          <p class="text-sm font-semibold text-primary-900 dark:text-primary-200">Chamada em andamento</p>
          <p class="mt-1 text-sm text-primary-700 dark:text-primary-400">{{ chamadaDestino }}</p>
        </div>

        <div class="flex items-center gap-3">
          <button
            v-if="!sip.chamadaEmAndamento"
            type="button"
            class="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-success-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-success-700 disabled:opacity-60"
            :disabled="!podeLigar || sip.processandoConexao"
            @click="iniciarDiscagem"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 7.318 5.932 13.25 13.25 13.25h1.5a2.25 2.25 0 0 0 2.244-2.077l.245-2.72a1.5 1.5 0 0 0-1.345-1.63l-2.902-.322a1.5 1.5 0 0 0-1.473.805l-.813 1.466a10.5 10.5 0 0 1-4.674-4.674l1.466-.813a1.5 1.5 0 0 0 .805-1.473l-.322-2.902a1.5 1.5 0 0 0-1.63-1.345l-2.72.245A2.25 2.25 0 0 0 2.25 6.75Z" />
            </svg>
            {{ sip.processandoConexao ? 'Conectando...' : 'Ligar' }}
          </button>

          <template v-else>
            <button
              type="button"
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-surface-200 transition hover:bg-surface-200"
              :class="sip.mutado ? 'bg-warning-100 border-warning-300 dark:bg-warning-900/40 dark:border-warning-700' : ''"
              @click="sip.mutado ? sip.desmutar() : sip.mutar()"
            >
              <svg v-if="!sip.mutado" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5 text-surface-700">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5 text-warning-600 dark:text-warning-400">
                <path stroke-linecap="round" stroke-linejoin="round" d="m3 3 18 18M12 18.75a6 6 0 0 0 5.854-4.682M9.537 8.463A3 3 0 0 0 9 10.5v2.25a3 3 0 0 0 5.463 1.537M15 10.5V6a3 3 0 0 0-6 0v.75M12 18.75v3.75m-3.75 0h7.5M6 12.75v-1.5" />
              </svg>
            </button>

            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-danger-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-danger-700"
              @click="encerrarChamadaAtual"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
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
import { computed, ref } from 'vue'
import { useSipStore } from '../stores/sip'

defineProps<{
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

