<template>
  <div class="relative flex items-center gap-2 border-b border-slate-700 bg-slate-800 px-3 py-1.5 text-white text-xs">
    <div
      class="h-2 w-2 rounded-full"
      :class="call.estado === 'ativa' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'"
    ></div>
    <span class="font-medium">
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

    <!-- Avatares -->
    <div class="flex -space-x-1.5">
      <div class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-600 text-[9px] font-bold text-slate-300 ring-1 ring-slate-800">
        {{ iniciaisUsuario(auth.user?.nome || '') }}
      </div>
      <div
        v-for="[userId, peer] in call.peers"
        :key="`bar-${userId}`"
        class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-600 text-[9px] font-bold text-slate-300 ring-1 ring-slate-800"
      >
        {{ iniciaisUsuario(peer.usuarioNome) }}
      </div>
    </div>

    <!-- Hidden audio elements for peer playback -->
    <template v-for="[userId, peer] in call.peers" :key="`audio-bar-${userId}`">
      <audio v-if="peer.stream" v-src-object="peer.stream" autoplay :muted="call.saidaAudioMutada"></audio>
    </template>

    <!-- Inline controls for audio call (no popup) -->
    <template v-if="!janelaChamadaAberta && call.tipoChamada === 1">
      <div class="ml-auto flex items-center gap-1.5">
        <button
          class="flex h-7 w-7 items-center justify-center rounded-full transition"
          :class="call.micMutado ? 'bg-slate-600 text-slate-400' : 'bg-slate-700 text-white'"
          title="Microfone"
          @click="call.alternarMicrofone()"
        >
          <svg v-if="!call.micMutado" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18" /></svg>
        </button>
        <button
          class="flex h-7 w-7 items-center justify-center rounded-full transition"
          :class="call.saidaAudioMutada ? 'bg-slate-600 text-slate-400' : 'bg-slate-700 text-white'"
          title="&Aacute;udio sa&iacute;da"
          @click="call.alternarSaidaAudio()"
        >
          <svg v-if="!call.saidaAudioMutada" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
        </button>
        <button
          v-if="call.estado === 'ativa'"
          class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-white transition hover:bg-slate-600"
          title="Adicionar usu&aacute;rio"
          @click="emit('open-add-user-modal')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
        </button>
        <button
          class="flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700"
          title="Ativar v&iacute;deo"
          @click="emit('upgrade-video')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
          V&iacute;deo
        </button>
        <button
          class="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600"
          title="Sair da chamada"
          @click="emit('leave-call')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m-9-1.023A11.985 11.985 0 0 0 3.18 10.96a.748.748 0 0 0 .3.89l2.96 1.857a.75.75 0 0 0 .9-.058l2.44-2.148a.75.75 0 0 0 .236-.656L9.614 7.56a.75.75 0 0 0-.484-.577 6.012 6.012 0 0 1-.38-.128ZM15.75 3.75c.128.038.256.08.38.128a.75.75 0 0 0 .484.577l.402 3.285a.75.75 0 0 1-.236.656l-2.44 2.148a.75.75 0 0 1-.9.058L10.48 8.745a.748.748 0 0 1-.3-.89 11.985 11.985 0 0 1 5.57-4.105Z" /></svg>
        </button>
      </div>
    </template>

    <!-- Controls when popup is open -->
    <template v-if="janelaChamadaAberta">
      <div class="ml-auto flex items-center gap-1.5">
        <button
          class="flex items-center gap-1 rounded-full bg-slate-700 px-2 py-1 text-[10px] font-medium text-white hover:bg-slate-600"
          @click="emit('focus-call-window')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
          Focar janela
        </button>
        <button
          class="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600"
          title="Sair da chamada"
          @click="emit('leave-call')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m-9-1.023A11.985 11.985 0 0 0 3.18 10.96a.748.748 0 0 0 .3.89l2.96 1.857a.75.75 0 0 0 .9-.058l2.44-2.148a.75.75 0 0 0 .236-.656L9.614 7.56a.75.75 0 0 0-.484-.577 6.012 6.012 0 0 1-.38-.128ZM15.75 3.75c.128.038.256.08.38.128a.75.75 0 0 0 .484.577l.402 3.285a.75.75 0 0 1-.236.656l-2.44 2.148a.75.75 0 0 1-.9.058L10.48 8.745a.748.748 0 0 1-.3-.89 11.985 11.985 0 0 1 5.57-4.105Z" /></svg>
        </button>
      </div>
    </template>

    <!-- Controls for video/screen without popup -->
    <template v-if="!janelaChamadaAberta && call.tipoChamada === 2">
      <div class="ml-auto flex items-center gap-1.5">
        <button
          class="flex items-center gap-1 rounded-full bg-slate-700 px-2 py-1 text-[10px] font-medium text-white hover:bg-slate-600"
          @click="emit('open-call-window')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
          Abrir janela
        </button>
        <button
          class="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600"
          title="Sair da chamada"
          @click="emit('leave-call')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m-9-1.023A11.985 11.985 0 0 0 3.18 10.96a.748.748 0 0 0 .3.89l2.96 1.857a.75.75 0 0 0 .9-.058l2.44-2.148a.75.75 0 0 0 .236-.656L9.614 7.56a.75.75 0 0 0-.484-.577 6.012 6.012 0 0 1-.38-.128ZM15.75 3.75c.128.038.256.08.38.128a.75.75 0 0 0 .484.577l.402 3.285a.75.75 0 0 1-.236.656l-2.44 2.148a.75.75 0 0 1-.9.058L10.48 8.745a.748.748 0 0 1-.3-.89 11.985 11.985 0 0 1 5.57-4.105Z" /></svg>
        </button>
      </div>
    </template>

    <div v-if="call.erroMsg" class="absolute left-3 right-3 top-full mt-1 rounded-lg bg-rose-500/90 px-3 py-1.5 text-xs text-white z-10">
      {{ call.erroMsg }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import { useCallStore } from '../stores/call'
import { iniciaisUsuario } from '../utils/formatters'
import { vSrcObject } from '../directives/vSrcObject'

defineProps<{
  janelaChamadaAberta: boolean
}>()

const emit = defineEmits<{
  'open-add-user-modal': []
  'upgrade-video': []
  'leave-call': []
  'open-call-window': []
  'focus-call-window': []
}>()

const auth = useAuthStore()
const call = useCallStore()
</script>
