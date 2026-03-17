<template>
  <div
    ref="containerRef"
    class="flex flex-col bg-slate-900 text-white"
    :class="flutuante
      ? 'fixed z-[60] rounded-xl shadow-2xl ring-1 ring-surface-700 overflow-hidden'
      : 'h-full'"
    :style="flutuante ? {
      left: drag.x.value + 'px',
      top: drag.y.value + 'px',
      width: drag.width.value + 'px',
      height: drag.height.value + 'px',
    } : undefined"
    @pointermove="flutuante ? drag.onPointerMove($event) : undefined"
    @pointerup="flutuante ? drag.onPointerUp() : undefined"
  >
    <!-- Header (drag handle when floating) -->
    <div
      class="flex items-center gap-2 border-b border-slate-700 bg-slate-800 px-3 py-2 shrink-0"
      :class="{ 'cursor-grab active:cursor-grabbing select-none': flutuante }"
      @pointerdown="flutuante ? drag.onPointerDown($event) : undefined"
    >
      <div
        class="h-2 w-2 rounded-full"
        :class="call.estado === 'ativa' ? 'bg-success-400' : 'bg-amber-400 animate-pulse'"
      ></div>
      <span class="text-xs font-medium">
        {{ call.estado === 'chamando' ? 'Chamando...' : call.estado === 'encerrando' ? 'Encerrando...' : 'Em chamada' }}
      </span>
      <span v-if="call.estado === 'ativa'" class="font-mono text-[10px] text-success-400">
        {{ call.duracaoChamadaFormatada }}
      </span>
      <span class="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
        {{ call.tipoChamada === 2 ? 'V&iacute;deo' : '&Aacute;udio' }}
      </span>
      <span class="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-success-400">
        {{ (call.peers.size + 1) }} {{ (call.peers.size + 1) === 1 ? 'pessoa' : 'pessoas' }}
      </span>
    </div>

    <!-- Video area -->
    <div class="flex-1 min-h-0 overflow-hidden p-2">
      <!-- Conference layout: 1 big + sidebar -->
      <template v-if="videoDestaque !== null">
        <div class="flex h-full gap-2">
          <!-- Main (highlighted) tile -->
          <div class="flex-1 min-w-0" @click="videoDestaque = null">
            <div class="relative h-full w-full overflow-hidden rounded-lg bg-slate-800 cursor-pointer">
              <template v-if="videoDestaque === 'local'">
                <div
                  v-if="call.cameraMutada && !call.compartilhandoTela"
                  class="flex h-full w-full items-center justify-center bg-slate-700"
                >
                  <span class="text-5xl font-bold text-surface-400">{{ iniciaisUsuario(auth.user?.nome || '') }}</span>
                </div>
                <video v-else ref="videoLocal" autoplay playsinline muted class="h-full w-full object-contain"></video>
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-1.5">
                  <span class="text-xs text-white">{{ auth.user?.nome }} (voc&ecirc;)</span>
                </div>
              </template>
              <template v-else>
                <template v-for="[userId, peer] in call.peers" :key="'main-' + userId">
                  <template v-if="userId === videoDestaque">
                    <div
                      v-if="!peer.stream?.getVideoTracks().length"
                      class="flex h-full w-full items-center justify-center bg-slate-700"
                    >
                      <span class="text-5xl font-bold text-surface-400">{{ iniciaisUsuario(peer.usuarioNome) }}</span>
                    </div>
                    <video v-else v-src-object="peer.stream" autoplay playsinline :muted="call.saidaAudioMutada" class="h-full w-full object-contain"></video>
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-1.5">
                      <span class="text-xs text-white">{{ peer.usuarioNome }}</span>
                    </div>
                  </template>
                </template>
              </template>
            </div>
          </div>

          <!-- Sidebar: small tiles -->
          <div class="flex w-1/4 min-w-[100px] flex-col gap-2 overflow-auto">
            <!-- Local tile (if not highlighted) -->
            <div
              v-if="videoDestaque !== 'local'"
              class="relative cursor-pointer overflow-hidden rounded-lg bg-slate-800 aspect-video"
              @click.stop="videoDestaque = 'local'"
            >
              <div
                v-if="call.somenteRecepcao || (call.cameraMutada && !call.compartilhandoTela)"
                class="flex h-full w-full items-center justify-center bg-slate-700"
              >
                <span class="text-lg font-bold text-surface-400">{{ iniciaisUsuario(auth.user?.nome || '') }}</span>
              </div>
              <video v-else ref="videoLocalSidebar" autoplay playsinline muted class="h-full w-full object-cover"></video>
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1 py-0.5">
                <span class="text-[9px] text-white">{{ auth.user?.nome }}</span>
              </div>
            </div>

            <!-- Remote tiles (excluding highlighted) -->
            <div
              v-for="[userId, peer] in call.peers"
              :key="'side-' + userId"
              v-show="userId !== videoDestaque"
              class="relative cursor-pointer overflow-hidden rounded-lg bg-slate-800 aspect-video"
              @click.stop="videoDestaque = userId"
            >
              <div
                v-if="!peer.stream?.getVideoTracks().length"
                class="flex h-full w-full items-center justify-center bg-slate-700"
              >
                <span class="text-lg font-bold text-surface-400">{{ iniciaisUsuario(peer.usuarioNome) }}</span>
              </div>
              <video v-else v-src-object="peer.stream" autoplay playsinline :muted="call.saidaAudioMutada" class="h-full w-full object-cover"></video>
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1 py-0.5">
                <span class="text-[9px] text-white">{{ peer.usuarioNome }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Standard grid layout -->
      <template v-else>
        <div class="grid h-full gap-2" :class="gridClass">
          <!-- Tile local -->
          <div
            class="relative cursor-pointer overflow-hidden rounded-lg bg-slate-800"
            :class="tileAspect"
            @click="videoDestaque = 'local'"
          >
            <template v-if="call.somenteRecepcao">
              <div class="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-700">
                <span class="text-3xl font-bold text-surface-400">{{ iniciaisUsuario(auth.user?.nome || '') }}</span>
                <p class="text-xs text-surface-400">Somente recep&ccedil;&atilde;o</p>
                <div class="flex gap-2">
                  <button
                    class="flex items-center gap-1 rounded-full bg-success-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-success-700"
                    @click.stop="ativarMicrofone"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
                    Ativar microfone
                  </button>
                  <button
                    class="flex items-center gap-1 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                    @click.stop="ativarCamera"
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
                <span class="text-3xl font-bold text-surface-400">{{ iniciaisUsuario(auth.user?.nome || '') }}</span>
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
            class="relative cursor-pointer overflow-hidden rounded-lg bg-slate-800"
            :class="tileAspect"
            @click="videoDestaque = userId"
          >
            <div
              v-if="!peer.stream?.getVideoTracks().length"
              class="flex h-full w-full items-center justify-center bg-slate-700"
            >
              <span class="text-3xl font-bold text-surface-400">{{ iniciaisUsuario(peer.usuarioNome) }}</span>
            </div>
            <video v-else v-src-object="peer.stream" autoplay playsinline :muted="call.saidaAudioMutada" class="h-full w-full object-cover"></video>
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
              <span class="text-[10px] text-white">{{ peer.usuarioNome }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Error message -->
    <div v-if="call.erroMsg" class="mx-3 mb-2 rounded-lg bg-danger-500/90 px-3 py-1.5 text-xs text-white">
      {{ call.erroMsg }}
    </div>

    <!-- Controls -->
    <div class="flex items-center justify-center gap-2 border-t border-slate-700 bg-slate-800 px-4 py-3 shrink-0">
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
        title="C&acirc;mera"
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
        title="&Aacute;udio sa&iacute;da"
        @click="call.alternarSaidaAudio()"
      >
        <svg v-if="!call.saidaAudioMutada" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
      </CallControlButton>

      <CallControlButton
        v-if="call.estado === 'ativa'"
        variant="secondary"
        active
        title="Adicionar usu&aacute;rio"
        @click="modalAdicionarUsuario = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
      </CallControlButton>

      <!-- Back to grid (only when conference layout is active) -->
      <CallControlButton
        v-if="videoDestaque !== null"
        variant="secondary"
        title="Voltar ao grid"
        @click="videoDestaque = null"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /></svg>
      </CallControlButton>

      <CallControlButton
        v-if="!fecharAoEncerrar"
        variant="secondary"
        :title="flutuante ? 'Expandir' : 'Minimizar'"
        @click="emit('toggle-float')"
      >
        <svg v-if="flutuante" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" /></svg>
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
      <div class="w-full max-w-md rounded-xl bg-surface-base p-4 text-surface-800">
        <h3 class="mb-3 text-lg font-semibold">Adicionar &agrave; chamada</h3>

        <div v-if="call.contatosNaoNaChamada.length === 0" class="py-4 text-center text-sm text-surface-500">
          Nenhum contato dispon&iacute;vel para adicionar.
        </div>
        <div v-else class="max-h-52 overflow-auto rounded border border-surface-200">
          <label
            v-for="contato in call.contatosNaoNaChamada"
            :key="`add-${contato.id}`"
            class="flex cursor-pointer items-center gap-2 border-b border-surface-100 px-3 py-2 text-sm hover:bg-surface-50"
          >
            <input v-model="usuariosParaAdicionar" type="checkbox" :value="contato.id" />
            <span>{{ contato.nome }}</span>
          </label>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button class="rounded border border-surface-300 px-3 py-2 text-sm hover:bg-surface-100" @click="cancelarAdicionarUsuario">Cancelar</button>
          <button
            class="rounded bg-success-600 px-3 py-2 text-sm font-medium text-white hover:bg-success-700"
            :disabled="usuariosParaAdicionar.length === 0"
            @click="confirmarAdicionarUsuario"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>

    <!-- Resize handles (only when floating) -->
    <template v-if="flutuante">
      <!-- Edges -->
      <div class="absolute inset-x-2 top-0 h-1.5 cursor-ns-resize" @pointerdown="drag.onResizePointerDown('n', $event)"></div>
      <div class="absolute inset-x-2 bottom-0 h-1.5 cursor-ns-resize" @pointerdown="drag.onResizePointerDown('s', $event)"></div>
      <div class="absolute inset-y-2 left-0 w-1.5 cursor-ew-resize" @pointerdown="drag.onResizePointerDown('w', $event)"></div>
      <div class="absolute inset-y-2 right-0 w-1.5 cursor-ew-resize" @pointerdown="drag.onResizePointerDown('e', $event)"></div>
      <!-- Corners -->
      <div class="absolute left-0 top-0 h-3 w-3 cursor-nwse-resize" @pointerdown="drag.onResizePointerDown('nw', $event)"></div>
      <div class="absolute right-0 top-0 h-3 w-3 cursor-nesw-resize" @pointerdown="drag.onResizePointerDown('ne', $event)"></div>
      <div class="absolute bottom-0 left-0 h-3 w-3 cursor-nesw-resize" @pointerdown="drag.onResizePointerDown('sw', $event)"></div>
      <div class="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize" @pointerdown="drag.onResizePointerDown('se', $event)"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from './stores/auth'
import { useCallStore } from './stores/call'
import { vSrcObject } from './directives/vSrcObject'
import { iniciaisUsuario } from './utils/formatters'
import { useDraggable } from './composables/useDraggable'
import CallControlButton from './components/CallControlButton.vue'

const props = withDefaults(defineProps<{
  fecharAoEncerrar?: boolean
  flutuante?: boolean
}>(), {
  fecharAoEncerrar: true,
  flutuante: false,
})

const emit = defineEmits<{
  'toggle-float': []
}>()

const drag = useDraggable()

const auth = useAuthStore()
const call = useCallStore()

const containerRef = ref<HTMLElement | null>(null)
const videoLocal = ref<HTMLVideoElement | null>(null)
const videoLocalSidebar = ref<HTMLVideoElement | null>(null)
const modalAdicionarUsuario = ref(false)
const usuariosParaAdicionar = ref<number[]>([])
const videoDestaque = ref<number | 'local' | null>(null)

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

// Bind local stream to video elements
function bindLocalStream(stream: MediaStream | null) {
  if (videoLocal.value) videoLocal.value.srcObject = stream
  if (videoLocalSidebar.value) videoLocalSidebar.value.srcObject = stream
}

watch(() => call.streamLocal, (stream) => bindLocalStream(stream))
watch(videoLocal, () => bindLocalStream(call.streamLocal))
watch(videoLocalSidebar, () => bindLocalStream(call.streamLocal))

// Reset highlight if peer leaves
watch(() => call.peers, () => {
  if (videoDestaque.value !== null && videoDestaque.value !== 'local') {
    if (!call.peers.has(videoDestaque.value)) {
      videoDestaque.value = null
    }
  }
}, { deep: false })

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
