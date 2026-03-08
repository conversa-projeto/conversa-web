<template>
  <div class="flex h-screen flex-col bg-slate-900 text-white">
    <!-- Header -->
    <div class="flex items-center gap-2 border-b border-slate-700 bg-slate-800 px-3 py-2">
      <div
        class="h-2 w-2 rounded-full"
        :class="call.estado === 'ativa' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'"
      ></div>
      <span class="text-xs font-medium">
        {{ call.estado === 'chamando' ? 'Chamando...' : call.estado === 'encerrando' ? 'Encerrando...' : 'Em chamada' }}
      </span>
      <span v-if="call.estado === 'ativa'" class="font-mono text-[10px] text-emerald-400">
        {{ call.duracaoChamadaFormatada }}
      </span>
      <span class="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
        {{ call.tipoChamada === 2 ? 'V\u00EDdeo' : '\u00C1udio' }}
      </span>
      <span class="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-emerald-400">
        {{ (call.peers.size + 1) }} {{ (call.peers.size + 1) === 1 ? 'pessoa' : 'pessoas' }}
      </span>
    </div>

    <!-- Video grid -->
    <div class="flex-1 overflow-auto p-2">
      <div class="grid gap-2" :class="gridClass">
        <!-- Tile local -->
        <div class="relative overflow-hidden rounded-lg bg-slate-800" :class="tileAspect">
          <template v-if="call.somenteRecepcao">
            <div class="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-700">
              <span class="text-3xl font-bold text-slate-400">{{ iniciaisUsuario(auth.user?.nome || '') }}</span>
              <p class="text-xs text-slate-400">Somente recep&ccedil;&atilde;o</p>
              <div class="flex gap-2">
                <button
                  class="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  @click="ativarMicrofone"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
                  Ativar microfone
                </button>
                <button
                  class="flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  @click="ativarCamera"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  Ativar c&acirc;mera
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <div
              v-if="call.cameraMutada && !call.compartilhandoTela"
              class="flex h-full w-full items-center justify-center bg-slate-700"
            >
              <span class="text-3xl font-bold text-slate-400">{{ iniciaisUsuario(auth.user?.nome || '') }}</span>
            </div>
            <video v-else ref="videoLocal" autoplay playsinline muted class="h-full w-full object-cover"></video>
          </template>
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
            <span class="text-[10px] text-white">{{ auth.user?.nome }} (voc&ecirc;)</span>
          </div>
        </div>

        <!-- Tiles remotos -->
        <div
          v-for="[userId, peer] in call.peers"
          :key="userId"
          class="relative overflow-hidden rounded-lg bg-slate-800"
          :class="tileAspect"
        >
          <div
            v-if="!peer.stream?.getVideoTracks().length"
            class="flex h-full w-full items-center justify-center bg-slate-700"
          >
            <span class="text-3xl font-bold text-slate-400">{{ iniciaisUsuario(peer.usuarioNome) }}</span>
          </div>
          <video v-else v-src-object="peer.stream" autoplay playsinline :muted="call.saidaAudioMutada" class="h-full w-full object-cover"></video>
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
            <span class="text-[10px] text-white">{{ peer.usuarioNome }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="call.erroMsg" class="mx-3 mb-2 rounded-lg bg-rose-500/90 px-3 py-1.5 text-xs text-white">
      {{ call.erroMsg }}
    </div>

    <!-- Controls -->
    <div class="flex items-center justify-center gap-2 border-t border-slate-700 bg-slate-800 px-4 py-3">
      <CallControlButton
        :active="!call.micMutado"
        title="Microfone"
        @click="call.alternarMicrofone()"
      >
        <svg v-if="!call.micMutado" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18" /></svg>
      </CallControlButton>

      <CallControlButton
        :active="!call.cameraMutada"
        title="Câmera"
        @click="call.alternarCamera()"
      >
        <svg v-if="!call.cameraMutada" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5l-1.409-1.409M2.25 7.5l14.5 14.5" /><path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18" /></svg>
      </CallControlButton>

      <CallControlButton
        variant="secondary"
        :active="call.compartilhandoTela"
        title="Compartilhar tela"
        @click="toggleCompartilharTela"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" /></svg>
      </CallControlButton>

      <CallControlButton
        :active="!call.saidaAudioMutada"
        title="Áudio saída"
        @click="call.alternarSaidaAudio()"
      >
        <svg v-if="!call.saidaAudioMutada" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
      </CallControlButton>

      <CallControlButton
        v-if="call.estado === 'ativa'"
        variant="secondary"
        active
        title="Adicionar usuário"
        @click="modalAdicionarUsuario = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
      </CallControlButton>

      <CallControlButton
        variant="danger"
        icon="leave"
        title="Sair da chamada"
        @click="sairDaChamada"
      />
    </div>

    <!-- Modal: Adicionar usuario -->
    <div v-if="modalAdicionarUsuario" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div class="w-full max-w-md rounded-xl bg-white p-4 text-slate-800">
        <h3 class="mb-3 text-lg font-semibold">Adicionar &agrave; chamada</h3>

        <div v-if="call.contatosNaoNaChamada.length === 0" class="py-4 text-center text-sm text-slate-500">
          Nenhum contato dispon&iacute;vel para adicionar.
        </div>
        <div v-else class="max-h-52 overflow-auto rounded border border-slate-200">
          <label
            v-for="contato in call.contatosNaoNaChamada"
            :key="`add-${contato.id}`"
            class="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
          >
            <input v-model="usuariosParaAdicionar" type="checkbox" :value="contato.id" />
            <span>{{ contato.nome }}</span>
          </label>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button class="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100" @click="cancelarAdicionarUsuario">Cancelar</button>
          <button
            class="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            :disabled="usuariosParaAdicionar.length === 0"
            @click="confirmarAdicionarUsuario"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from './stores/auth'
import { useCallStore } from './stores/call'
import { vSrcObject } from './directives/vSrcObject'
import { iniciaisUsuario } from './utils/formatters'
import CallControlButton from './components/CallControlButton.vue'
const props = withDefaults(defineProps<{
  fecharAoEncerrar?: boolean
}>(), {
  fecharAoEncerrar: true
})

const auth = useAuthStore()
const call = useCallStore()

const videoLocal = ref<HTMLVideoElement | null>(null)
const modalAdicionarUsuario = ref(false)
const usuariosParaAdicionar = ref<number[]>([])

const gridClass = computed(() => {
  const total = call.peers.size + 1
  if (total <= 1) return 'grid-cols-1'
  if (total === 2) return 'grid-cols-1 md:grid-cols-2'
  if (total <= 4) return 'grid-cols-2'
  if (total <= 6) return 'grid-cols-2 md:grid-cols-3'
  return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
})

const tileAspect = computed(() => {
  return call.tipoChamada === 2 ? 'aspect-video' : 'aspect-square max-h-48'
})

async function ativarMicrofone() {
  try {
    await call.iniciarTransmissaoLocal({ video: false })
  } catch (e) {
    console.error('Erro ao ativar microfone', e)
  }
}

async function ativarCamera() {
  try {
    await call.iniciarTransmissaoLocal({ video: true })
  } catch (e) {
    console.error('Erro ao ativar camera', e)
  }
}

async function toggleCompartilharTela() {
  try {
    if (call.compartilhandoTela) {
      await call.pararCompartilhamento()
    } else {
      await call.compartilharTela()
    }
  } catch (e) {
    console.error('Erro ao compartilhar tela', e)
  }
}

function sairDaChamada() {
  if (call.estado === 'chamando') {
    void call.cancelarChamada()
  } else {
    void call.sairDaChamada()
  }
}

function cancelarAdicionarUsuario() {
  modalAdicionarUsuario.value = false
  usuariosParaAdicionar.value = []
}

async function confirmarAdicionarUsuario() {
  if (usuariosParaAdicionar.value.length === 0) return

  try {
    for (const id of usuariosParaAdicionar.value) {
      await call.adicionarUsuario(id)
    }
  } catch (e) {
    console.error('Erro ao adicionar usuario', e)
  } finally {
    cancelarAdicionarUsuario()
  }
}

// Bind local stream to video element
watch(
  () => call.streamLocal,
  (stream) => {
    if (videoLocal.value) {
      videoLocal.value.srcObject = stream
    }
  }
)

watch(videoLocal, (el) => {
  if (el && call.streamLocal) {
    el.srcObject = call.streamLocal
  }
})

// Close window when call ends
watch(
  () => call.emChamada,
  (em) => {
    if (!em && props.fecharAoEncerrar) {
      window.close()
    }
  }
)
</script>
