<template>
  <div v-if="aberta" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
    <div class="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div class="flex items-start justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Discador SIP</p>
          <h2 class="mt-1 text-lg font-semibold text-slate-900">Ramal {{ sipConfig?.sip_user || 'indisponivel' }}</h2>
        </div>
        <button class="flex h-10 w-10 items-center justify-center rounded-full text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" @click="emit('close')">&times;</button>
      </div>

      <div class="space-y-5 px-5 py-5">
        <div class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-500">Status do ramal</p>
            <p class="mt-1 text-sm font-semibold" :class="statusClasse">{{ statusTexto }}</p>
          </div>
          <span class="h-3 w-3 rounded-full" :class="statusBadgeClasse"></span>
        </div>

        <div v-if="erro" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ erro }}</div>

        <div class="rounded-2xl border border-slate-200 p-4">
          <label class="mb-2 block text-sm font-medium text-slate-700">Numero para discagem</label>
          <div class="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 focus-within:border-blue-500">
            <input
              v-model="numero"
              type="text"
              inputmode="tel"
              class="min-w-0 flex-1 bg-transparent text-center text-2xl tracking-[0.18em] text-slate-900 outline-none"
              placeholder="Digite o numero"
            />
            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
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
            class="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
            @click="pressionarTecla(tecla.valor)"
          >
            <span class="block text-2xl font-semibold text-slate-900">{{ tecla.valor }}</span>
            <span class="mt-1 block text-[11px] uppercase tracking-[0.24em] text-slate-400">{{ tecla.subtitulo }}</span>
          </button>
        </div>

        <div v-if="chamadaEmAndamento" class="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p class="text-sm font-semibold text-blue-900">Chamada em andamento</p>
          <p class="mt-1 text-sm text-blue-700">{{ chamadaDestino }}</p>
        </div>

        <div class="flex items-center gap-3">
          <button
            v-if="!chamadaEmAndamento"
            type="button"
            class="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            :disabled="!podeLigar || processando"
            @click="iniciarDiscagem"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 7.318 5.932 13.25 13.25 13.25h1.5a2.25 2.25 0 0 0 2.244-2.077l.245-2.72a1.5 1.5 0 0 0-1.345-1.63l-2.902-.322a1.5 1.5 0 0 0-1.473.805l-.813 1.466a10.5 10.5 0 0 1-4.674-4.674l1.466-.813a1.5 1.5 0 0 0 .805-1.473l-.322-2.902a1.5 1.5 0 0 0-1.63-1.345l-2.72.245A2.25 2.25 0 0 0 2.25 6.75Z" />
            </svg>
            {{ processando ? 'Conectando...' : 'Ligar' }}
          </button>

          <button
            v-else
            type="button"
            class="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
            :disabled="processando"
            @click="encerrarChamadaAtual"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 9.75c3.75-1.5 9.75-1.5 13.5 0m-13.5 0a18.439 18.439 0 0 0-1.318 4.849A1.5 1.5 0 0 0 5.426 16.5h.258c.398 0 .779-.158 1.06-.439l1.283-1.282a1.5 1.5 0 0 1 1.06-.44h5.826c.398 0 .779.158 1.06.44l1.283 1.282c.281.281.662.439 1.06.439h.258a1.5 1.5 0 0 0 1.494-1.901A18.438 18.438 0 0 0 18.75 9.75m-13.5 0 .963-2.89A1.875 1.875 0 0 1 7.994 5.625h8.012c.807 0 1.523.516 1.781 1.235l.963 2.89" />
            </svg>
            Encerrar chamada
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useCallSession, useSipClient, type SipClient, type SipClientConfig } from 'vuesip'
import type { SipConfig } from '../types/api'
import { sipAtivo } from '../utils/sip'

const props = defineProps<{
  aberta: boolean
  sipConfig: SipConfig | null
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

const numero = ref('')
const erro = ref('')
const processando = ref(false)
const sipClientRef = shallowRef<SipClient | null>(null)
const sipClient = useSipClient(undefined, { autoCleanup: false })
const chamada = useCallSession(sipClientRef)

const statusTexto = computed(() => {
  if (!sipAtivo(props.sipConfig?.ativo)) return 'Ramal inativo'
  if (sipClient.isRegistered.value) return 'Registrado'
  if (sipClient.isConnecting.value) return 'Conectando'
  if (sipClient.isConnected.value) return 'Conectado sem registro'
  return 'Desconectado'
})

const statusClasse = computed(() => {
  if (sipClient.isRegistered.value) return 'text-emerald-700'
  if (sipClient.isConnecting.value) return 'text-amber-700'
  return 'text-slate-700'
})

const statusBadgeClasse = computed(() => {
  if (sipClient.isRegistered.value) return 'bg-emerald-500'
  if (sipClient.isConnecting.value) return 'bg-amber-400'
  return 'bg-slate-300'
})

const chamadaEmAndamento = computed(() => !['idle', 'terminated', 'failed'].includes(String(chamada.state.value)))
const chamadaDestino = computed(() => chamada.remoteUri.value || destinoFormatado.value)
const destinoFormatado = computed(() => {
  if (!numero.value) return 'sip:numero@dominio'
  const dominio = props.sipConfig?.domain || 'dominio'
  return `sip:${numero.value}@${dominio}`
})
const podeLigar = computed(() => !!numero.value.trim() && sipAtivo(props.sipConfig?.ativo))

watch(() => props.aberta, (aberta) => {
  if (!aberta) return
  erro.value = ''
  if (sipAtivo(props.sipConfig?.ativo)) {
    void prepararRamal()
  }
})

watch(() => props.sipConfig, () => {
  erro.value = ''
}, { deep: true })

onUnmounted(() => {
  void sipClient.disconnect().catch(() => undefined)
})

function montarConfiguracao(): SipClientConfig {
  const config = props.sipConfig
  if (!config) {
    throw new Error('Configuracao SIP indisponivel.')
  }

  return {
    uri: config.ws_server,
    sipUri: `sip:${config.sip_user}@${config.domain}`,
    password: config.sip_password,
    displayName: config.display_name || config.sip_user,
    authorizationUsername: config.auth_user || config.sip_user,
    realm: config.domain,
    registrationOptions: {
      autoRegister: true,
    },
    mediaConfiguration: {
      audio: true,
      video: false,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  }
}

async function prepararRamal() {
  if (!sipAtivo(props.sipConfig?.ativo)) return
  if (sipClient.isRegistered.value || sipClient.isConnecting.value) return

  processando.value = true
  erro.value = ''

  try {
    const resultado = sipClient.updateConfig(montarConfiguracao())
    if (!resultado.valid) {
      throw new Error(resultado.errors?.join(', ') || 'Configuracao SIP invalida.')
    }

    if (!sipClient.isConnected.value) {
      await sipClient.connect()
    }

    sipClientRef.value = sipClient.getClient()

    if (!sipClient.isRegistered.value) {
      await sipClient.register()
    }
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Nao foi possivel conectar o ramal SIP.'
  } finally {
    processando.value = false
  }
}

function pressionarTecla(valor: string) {
  erro.value = ''
  if (chamadaEmAndamento.value) {
    void enviarDtmf(valor)
    return
  }
  numero.value += valor
}

async function enviarDtmf(valor: string) {
  try {
    await chamada.sendDTMF(valor)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Nao foi possivel enviar DTMF.'
  }
}

function apagarUltimoDigito() {
  numero.value = numero.value.slice(0, -1)
}

async function iniciarDiscagem() {
  if (!podeLigar.value) return

  processando.value = true
  erro.value = ''

  try {
    await prepararRamal()
    if (!sipClient.isRegistered.value) {
      throw new Error('O ramal SIP ainda nao esta registrado.')
    }

    await chamada.makeCall(`sip:${numero.value}@${props.sipConfig!.domain}`, {
      audio: true,
      video: false,
    })
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Nao foi possivel iniciar a discagem.'
  } finally {
    processando.value = false
  }
}

async function encerrarChamadaAtual() {
  processando.value = true
  erro.value = ''
  try {
    await chamada.hangup()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Nao foi possivel encerrar a chamada.'
  } finally {
    processando.value = false
  }
}
</script>
