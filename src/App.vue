<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-100 via-slate-100 to-blue-50 p-4">
    <div v-if="!auth.isAuthenticated" class="mx-auto mt-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div class="bg-slate-900/80 px-6 py-8 text-center">
        <img src="/logo.png" alt="Logo" class="mx-auto p-2" />
        <h1 class="mt-4 text-2xl font-bold text-white">Conversa</h1>
        <p class="mt-1 text-sm text-slate-300">Entre com seu usuário e senha</p>
      </div>

      <form class="space-y-4 px-6 py-6" @submit.prevent="fazerLogin">
        <label class="block text-sm font-medium text-slate-700">
          Usuário
          <input
            v-model="login"
            type="text"
            class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            autocomplete="username"
            required
          />
        </label>

        <label class="block text-sm font-medium text-slate-700">
          Senha
          <input
            v-model="senha"
            type="password"
            class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            autocomplete="current-password"
            required
          />
        </label>

        <p v-if="erro" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ erro }}</p>

        <button
          type="submit"
          :disabled="carregandoLogin"
          class="w-full rounded-xl bg-blue-600 px-3 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          {{ carregandoLogin ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
    </div>

    <div v-else class="flex h-[calc(100vh-2rem)] overflow-hidden rounded-xl bg-white shadow">
      <aside class="w-full max-w-sm border-r border-slate-200 bg-slate-50">
        <div class="border-b border-slate-200 p-4">
          <div class="mb-3 flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-500">Usu&aacute;rio</p>
              <p class="font-semibold text-slate-800">{{ auth.user?.nome }}</p>
            </div>
            <button class="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900" @click="sair">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
              Sair
            </button>
          </div>

          <button class="flex w-full items-center justify-center gap-1.5 rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700" @click="abrirModalGrupo = true">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
            Novo grupo
          </button>
        </div>

        <div class="space-y-4 p-4">
          <section>
            <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Contatos</h2>
            <input
              v-model="filtroContato"
              type="text"
              class="mb-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
              placeholder="Pesquisar contato"
            />
            <div class="max-h-44 overflow-auto rounded border border-slate-200 bg-white">
              <button
                v-for="contato in contatosFiltrados"
                :key="contato.id"
                class="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                @click="abrirConversaContato(contato.id)"
              >
                <span>{{ contato.nome }}</span>
                <span class="text-xs text-slate-500">@{{ contato.login }}</span>
              </button>
            </div>
          </section>

          <section>
            <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Conversas</h2>
            <input
              v-model="filtroConversa"
              type="text"
              class="mb-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
              placeholder="Pesquisar conversa"
            />
            <div class="max-h-[calc(100vh-23rem)] overflow-auto rounded border border-slate-200 bg-white">
              <button
                v-for="conversa in conversasFiltradas"
                :key="conversa.id"
                class="w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
                :class="conversa.id === chat.conversaAtivaId ? 'bg-blue-50' : ''"
                @click="abrirConversa(conversa.id)"
              >
                <div class="flex items-center justify-between text-sm font-medium text-slate-800">
                  <span>{{ conversa.descricao || conversa.nome || `Conversa #${conversa.id}` }}</span>
                  <span
                    v-if="(conversa.mensagens_sem_visualizar || 0) > 0"
                    class="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white"
                  >
                    {{ conversa.mensagens_sem_visualizar }}
                  </span>
                </div>
                <p class="truncate text-xs text-slate-500">{{ conversa.ultima_mensagem_texto || 'Sem mensagens' }}</p>
              </button>
            </div>
          </section>
        </div>
      </aside>

      <main class="flex flex-1 flex-col overflow-hidden">
        <!-- Barra de chamada ativa (sempre visível quando em chamada) -->
        <div v-if="call.emChamada" class="relative flex items-center gap-2 border-b border-slate-700 bg-slate-800 px-3 py-1.5 text-white text-xs">
          <div
            class="h-2 w-2 rounded-full"
            :class="call.estado === 'ativa' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'"
          ></div>
          <span class="font-medium">
            {{ call.estado === 'chamando' ? 'Chamando...' : call.estado === 'encerrando' ? 'Encerrando...' : 'Em chamada' }}
          </span>
          <span class="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
            {{ call.tipoChamada === 2 ? 'V\u00EDdeo' : '\u00C1udio' }}
          </span>
          <span class="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-emerald-400">
            {{ (call.peers.size + 1) }} {{ (call.peers.size + 1) === 1 ? 'pessoa' : 'pessoas' }}
          </span>

          <!-- Avatares dos participantes -->
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

          <!-- Audio elements (hidden) para playback dos peers (funciona tanto para audio quanto video) -->
          <template v-for="[userId, peer] in call.peers" :key="`audio-bar-${userId}`">
            <audio v-if="peer.stream" v-src-object="peer.stream" autoplay :muted="call.saidaAudioMutada"></audio>
          </template>

          <!-- Controles inline para chamada de audio (sem popup) -->
          <template v-if="!janelaChamada && call.tipoChamada === 1">
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
                @click="modalAdicionarUsuario = true"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
              </button>
              <button
                class="flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700"
                title="Ativar v&iacute;deo"
                @click="upgradeParaVideoUI"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                V&iacute;deo
              </button>
              <button
                class="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600"
                title="Sair da chamada"
                @click="sairDaChamadaAtual"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m-9-1.023A11.985 11.985 0 0 0 3.18 10.96a.748.748 0 0 0 .3.89l2.96 1.857a.75.75 0 0 0 .9-.058l2.44-2.148a.75.75 0 0 0 .236-.656L9.614 7.56a.75.75 0 0 0-.484-.577 6.012 6.012 0 0 1-.38-.128ZM15.75 3.75c.128.038.256.08.38.128a.75.75 0 0 0 .484.577l.402 3.285a.75.75 0 0 1-.236.656l-2.44 2.148a.75.75 0 0 1-.9.058L10.48 8.745a.748.748 0 0 1-.3-.89 11.985 11.985 0 0 1 5.57-4.105Z" /></svg>
              </button>
            </div>
          </template>

          <!-- Controles para quando popup esta aberta (video/tela) -->
          <template v-if="janelaChamada">
            <div class="ml-auto flex items-center gap-1.5">
              <button
                class="flex items-center gap-1 rounded-full bg-slate-700 px-2 py-1 text-[10px] font-medium text-white hover:bg-slate-600"
                @click="janelaChamada?.focus()"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                Focar janela
              </button>
              <button
                class="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600"
                title="Sair da chamada"
                @click="sairDaChamadaAtual"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m-9-1.023A11.985 11.985 0 0 0 3.18 10.96a.748.748 0 0 0 .3.89l2.96 1.857a.75.75 0 0 0 .9-.058l2.44-2.148a.75.75 0 0 0 .236-.656L9.614 7.56a.75.75 0 0 0-.484-.577 6.012 6.012 0 0 1-.38-.128ZM15.75 3.75c.128.038.256.08.38.128a.75.75 0 0 0 .484.577l.402 3.285a.75.75 0 0 1-.236.656l-2.44 2.148a.75.75 0 0 1-.9.058L10.48 8.745a.748.748 0 0 1-.3-.89 11.985 11.985 0 0 1 5.57-4.105Z" /></svg>
              </button>
            </div>
          </template>

          <!-- Controles para video/tela SEM popup (fallback se bloqueou popup) -->
          <template v-if="!janelaChamada && call.tipoChamada === 2">
            <div class="ml-auto flex items-center gap-1.5">
              <button
                class="flex items-center gap-1 rounded-full bg-slate-700 px-2 py-1 text-[10px] font-medium text-white hover:bg-slate-600"
                @click="abrirJanelaChamada"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                Abrir janela
              </button>
              <button
                class="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600"
                title="Sair da chamada"
                @click="sairDaChamadaAtual"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m-9-1.023A11.985 11.985 0 0 0 3.18 10.96a.748.748 0 0 0 .3.89l2.96 1.857a.75.75 0 0 0 .9-.058l2.44-2.148a.75.75 0 0 0 .236-.656L9.614 7.56a.75.75 0 0 0-.484-.577 6.012 6.012 0 0 1-.38-.128ZM15.75 3.75c.128.038.256.08.38.128a.75.75 0 0 0 .484.577l.402 3.285a.75.75 0 0 1-.236.656l-2.44 2.148a.75.75 0 0 1-.9.058L10.48 8.745a.748.748 0 0 1-.3-.89 11.985 11.985 0 0 1 5.57-4.105Z" /></svg>
              </button>
            </div>
          </template>

          <div v-if="call.erroMsg" class="absolute left-3 right-3 top-full mt-1 rounded-lg bg-rose-500/90 px-3 py-1.5 text-xs text-white z-10">
            {{ call.erroMsg }}
          </div>
        </div>

        <div v-if="chat.conversaAtiva" class="border-b border-slate-200 p-4">
          <div class="mx-auto w-full max-w-[1200px]">
            <div class="mb-2 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-800">
                {{ chat.conversaAtiva.descricao || chat.conversaAtiva.nome || `Conversa #${chat.conversaAtiva.id}` }}
              </h2>
              <div class="flex items-center gap-2">
                <button
                  v-if="!call.emChamada && !call.recebendoChamada"
                  class="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-sm text-emerald-700 hover:bg-emerald-200"
                  title="Chamada de voz"
                  @click="solicitarChamada(1)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                  Ligar
                </button>
                <button
                  v-if="!call.emChamada && !call.recebendoChamada"
                  class="flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1.5 text-sm text-blue-700 hover:bg-blue-200"
                  title="Chamada de v&iacute;deo"
                  @click="solicitarChamada(2)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  V&iacute;deo
                </button>
                <button
                  v-if="!call.emChamada && !call.recebendoChamada"
                  class="flex items-center gap-1 rounded-lg bg-purple-100 px-2.5 py-1.5 text-sm text-purple-700 hover:bg-purple-200"
                  title="Compartilhar tela"
                  @click="solicitarChamada(2, true)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" /></svg>
                  Tela
                </button>
                <span class="text-xs uppercase tracking-wide text-slate-500">{{ chat.conversaAtiva.tipo === 2 ? 'Grupo' : 'Chat' }}</span>
              </div>
            </div>

            <div class="flex gap-2">
              <input
                v-model="buscaNoChat"
                type="text"
                class="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Pesquisar nesta conversa"
                @keyup.enter="pesquisarNoChat"
              />
              <button class="flex items-center gap-1 rounded bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800" @click="pesquisarNoChat">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                Buscar
              </button>
            </div>

            <div v-if="chat.resultadosBuscaConversa.length" class="mt-2 max-h-28 overflow-auto rounded border border-amber-200 bg-amber-50 p-2 text-xs">
              <button
                v-for="item in chat.resultadosBuscaConversa"
                :key="`find-${item.id}`"
                class="block w-full truncate rounded px-2 py-1 text-left text-amber-800 hover:bg-amber-100"
                @click="irParaMensagem(item.id)"
              >
                #{{ item.id }} - {{ resumoMensagem(item) }}
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="chat.conversaAtiva"
          class="flex-1 overflow-auto bg-slate-100 p-4"
          ref="mensagensContainer"
          @scroll="aoScrollChat"
        >
          <div class="mx-auto w-full max-w-[1200px]">
            <div v-if="chat.carregando" class="text-center text-sm text-slate-500">Carregando mensagens...</div>

            <template v-for="item in itensMensagens" :key="item.key">
              <div v-if="item.tipo === 'dia'" class="my-3 flex justify-center">
                <span class="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600">
                  {{ item.label }}
                </span>
              </div>

              <div
                v-else
                :id="`msg-${item.mensagem.id}`"
                class="mb-3 flex"
                :class="item.mensagem.remetente_id === auth.user?.id ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[80%] rounded-xl px-3 py-2"
                  :class="item.mensagem.remetente_id === auth.user?.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-800'"
                >
                  <p
                    v-if="chat.conversaAtiva?.tipo === 2 && item.mensagem.remetente_id !== auth.user?.id"
                    class="mb-1 text-xs font-semibold text-slate-500"
                  >
                    {{ item.mensagem.remetente }}
                  </p>

                  <div
                    v-for="conteudo in item.mensagem.conteudos"
                    :key="`${item.mensagem.id}-${conteudo.id}-${conteudo.ordem}`"
                    class="mb-1 last:mb-0"
                  >
                    <p
                      v-if="conteudo.tipo === 1"
                      class="whitespace-pre-wrap break-words"
                      :class="classeTextoMensagem(conteudo.conteudo)"
                    >
                      {{ conteudo.conteudo }}
                    </p>

                    <img
                      v-else-if="conteudo.tipo === 2"
                      :src="anexoUrl(conteudo.conteudo)"
                      alt="Imagem"
                      class="max-h-64 cursor-zoom-in rounded border border-slate-200"
                      @load="aoCarregarImagemNoChat"
                      @click="abrirImagemTelaCheia(conteudo.conteudo, conteudo.nome || 'Imagem')"
                    />

                    <template v-else-if="conteudo.tipo === 3">
                      <template v-if="isVideoConteudo(conteudo)">
                        <div class="w-[420px] max-w-full">
                          <video
                            controls
                            :src="anexoUrl(conteudo.conteudo)"
                            class="h-[236px] w-full rounded border border-slate-200 bg-black object-contain"
                          />
                        </div>
                        <button
                          class="mt-1 flex items-center gap-1 text-xs underline"
                          @click.prevent="abrirAnexo(conteudo.conteudo, conteudo.nome || 'video')"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                          Baixar video
                        </button>
                      </template>
                      <div v-else class="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-2 text-slate-800">
                        <div class="min-w-12 text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="mx-auto h-7 w-7 text-slate-500"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                          <div class="mt-1 max-w-28 truncate text-[11px]" :title="conteudo.nome || 'Arquivo'">
                            {{ conteudo.nome || 'Arquivo' }}
                          </div>
                        </div>
                        <button
                          class="ml-auto flex items-center gap-1 rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-800"
                          @click.prevent="abrirAnexo(conteudo.conteudo, conteudo.nome || 'Arquivo')"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                          Download
                        </button>
                      </div>
                    </template>
                    <audio v-else-if="conteudo.tipo === 4" controls :src="anexoUrl(conteudo.conteudo)" class="w-64" />
                  </div>

                  <div class="mt-1 flex items-center justify-end gap-1 text-[11px]">
                    <span :class="item.mensagem.remetente_id === auth.user?.id ? 'text-slate-200' : 'text-slate-500'">
                      {{ formatarHora(item.mensagem.inserida) }}
                    </span>
                    <span
                      v-if="item.mensagem.remetente_id === auth.user?.id"
                      :class="statusEntregaClasse(item.mensagem)"
                    >
                      {{ statusEntrega(item.mensagem) }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div v-else class="flex flex-1 items-center justify-center text-slate-500">
          Selecione uma conversa para come&ccedil;ar.
        </div>

        <div v-if="chat.conversaAtiva" class="border-t border-slate-200 bg-white p-3">
          <input ref="inputArquivo" type="file" class="hidden" @change="selecionarArquivo" accept="image/*,application/pdf,audio/*,video/*,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar" />

          <div class="mx-auto w-full max-w-[1200px]">
            <p v-if="erro" class="mb-2 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ erro }}</p>
            <div class="relative flex items-center gap-2">
              <button class="flex items-center gap-1 rounded bg-slate-200 px-3 py-2 text-sm hover:bg-slate-300" title="Anexar arquivo" @click="inputArquivo?.click()">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg>
                Arquivo
              </button>

              <button class="flex items-center gap-1 rounded bg-slate-200 px-3 py-2 text-sm hover:bg-slate-300" title="Emoji" @click="mostrarEmoji = !mostrarEmoji">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>
                Emoji
              </button>

              <div v-if="mostrarEmoji" class="absolute bottom-12 left-0 z-10 grid grid-cols-6 gap-1 rounded border border-slate-200 bg-white p-2 shadow">
                <button
                  v-for="emoji in emojis"
                  :key="emoji"
                  class="rounded px-1 py-1 text-lg hover:bg-slate-100"
                  @click="inserirEmoji(emoji)"
                >
                  {{ emoji }}
                </button>
              </div>

              <button
                class="flex items-center gap-1 rounded px-3 py-2 text-sm font-medium text-white"
                :class="gravandoAudio ? 'bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-700'"
                @mousedown.prevent="iniciarAudio"
                @mouseup.prevent="pararAudio"
                @mouseleave.prevent="pararAudio"
                @touchstart.prevent="iniciarAudio"
                @touchend.prevent="pararAudio"
                @touchcancel.prevent="pararAudio"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
                {{ gravandoAudio ? 'Gravando...' : '\u00C1udio' }}
              </button>

              <input
                v-model="textoMensagem"
                type="text"
                class="flex-1 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Digite sua mensagem"
                @keyup.enter="enviarTexto"
                @paste="aoColarNoChat"
              />

              <button class="flex items-center gap-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" @click="enviarTexto">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                Enviar
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <div
      v-if="imagemTelaCheiaAberta"
      class="fixed inset-0 z-30 flex flex-col items-center justify-center overflow-hidden bg-black/90"
      @click.self="fecharImagemTelaCheia"
    >
      <div class="flex flex-1 items-center justify-center p-4" @click.self="fecharImagemTelaCheia">
        <img
          :src="imagemTelaCheiaUrl"
          :alt="imagemTelaCheiaNome"
          class="max-h-[85vh] max-w-[92vw] select-none object-contain transition-transform duration-150"
          :style="{ transform: `scale(${zoomImagemTelaCheia})` }"
          @wheel.prevent="zoomImagemPorRoda"
        />
      </div>

      <div class="relative z-10 mb-4 flex items-center gap-3 rounded-full bg-black/60 px-5 py-2 backdrop-blur-sm">
        <button class="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white text-lg hover:bg-white/25" @click="ajustarZoomImagem(-0.2)">-</button>
        <span class="min-w-14 text-center text-xs text-white/70">{{ Math.round(zoomImagemTelaCheia * 100) }}%</span>
        <button class="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white text-lg hover:bg-white/25" @click="ajustarZoomImagem(0.2)">+</button>
        <div class="mx-2 h-5 w-px bg-white/20"></div>
        <button class="rounded-full bg-white/15 px-4 py-1.5 text-xs text-white hover:bg-white/25" @click="fecharImagemTelaCheia">Fechar</button>
      </div>
    </div>

    <div
      v-if="previewImagemAberta"
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
      @click.self="fecharPreviewImagem"
    >
      <div class="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl">
        <p class="mb-3 text-sm font-medium text-slate-700">Pré-visualização da imagem</p>
        <div class="flex items-center justify-center rounded-xl bg-slate-100 p-2">
          <img :src="previewImagemUrl" :alt="previewImagemNome" class="max-h-[70vh] max-w-full rounded object-contain" />
        </div>
        <p class="mt-2 truncate text-xs text-slate-500">{{ previewImagemNome }}</p>
        <div class="mt-4 flex justify-end gap-2">
          <button class="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100" @click="fecharPreviewImagem">
            Cancelar
          </button>
          <button class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" @click="confirmarEnvioPreviewImagem">
            Enviar imagem
          </button>
        </div>
      </div>
    </div>

    <div v-if="abrirModalGrupo" class="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4">
      <div class="w-full max-w-md rounded-xl bg-white p-4">
        <h3 class="mb-3 text-lg font-semibold text-slate-800">Criar grupo</h3>

        <label class="mb-3 block text-sm text-slate-700">
          Nome do grupo
          <input
            v-model="nomeGrupo"
            type="text"
            class="mt-1 w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            placeholder="Ex: Projeto Alpha"
          />
        </label>

        <p class="mb-2 text-sm font-medium text-slate-700">Selecionar usu&aacute;rios</p>
        <div class="max-h-52 overflow-auto rounded border border-slate-200">
          <label
            v-for="contato in chat.contatos"
            :key="`group-${contato.id}`"
            class="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
          >
            <input v-model="membrosGrupo" type="checkbox" :value="contato.id" />
            <span>{{ contato.nome }}</span>
          </label>
        </div>

        <p v-if="erroGrupo" class="mt-2 rounded bg-rose-50 px-2 py-1 text-sm text-rose-700">{{ erroGrupo }}</p>

        <div class="mt-4 flex justify-end gap-2">
          <button class="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100" @click="cancelarGrupo">Cancelar</button>
          <button class="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700" @click="confirmarGrupo">Criar</button>
        </div>
      </div>
    </div>

    <!-- Modal: Selecionar participantes para chamada em grupo -->
    <div v-if="modalParticipantesChamada" class="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4">
      <div class="w-full max-w-md rounded-xl bg-white p-4">
        <h3 class="mb-3 text-lg font-semibold text-slate-800">
          {{ tipoChamadaPendente === 2 ? 'Chamada de v\u00EDdeo' : 'Chamada de voz' }}
        </h3>

        <p class="mb-2 text-sm font-medium text-slate-700">Selecionar participantes</p>
        <div class="max-h-52 overflow-auto rounded border border-slate-200">
          <label
            v-for="contato in chat.contatos"
            :key="`call-${contato.id}`"
            class="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
          >
            <input v-model="participantesSelecionados" type="checkbox" :value="contato.id" />
            <span>{{ contato.nome }}</span>
          </label>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button class="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100" @click="cancelarModalParticipantes">Cancelar</button>
          <button
            class="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            :disabled="participantesSelecionados.length === 0"
            @click="confirmarChamadaGrupo"
          >
            Iniciar chamada
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Chamada recebida -->
    <div
      v-if="call.recebendoChamada && call.chamada"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div class="text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg v-if="call.tipoChamada === 2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-8 w-8"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-8 w-8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
          </div>

          <h3 class="text-lg font-semibold text-slate-800">Chamada recebida</h3>
          <p class="mt-1 text-sm text-slate-500">
            {{ call.chamadaRemetente?.usuario_nome || 'Algu\u00E9m' }} est&aacute; ligando...
          </p>
          <p class="mt-1 text-xs text-slate-400">
            {{ call.tipoChamada === 2 ? 'V\u00EDdeo + \u00C1udio' : 'Somente \u00C1udio' }}
          </p>
        </div>

        <div class="mt-6 flex justify-center gap-4">
          <button
            class="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow hover:bg-rose-600"
            title="Recusar"
            @click="recusarChamadaRecebida"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-7 w-7"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m-9-1.023A11.985 11.985 0 0 0 3.18 10.96a.748.748 0 0 0 .3.89l2.96 1.857a.75.75 0 0 0 .9-.058l2.44-2.148a.75.75 0 0 0 .236-.656L9.614 7.56a.75.75 0 0 0-.484-.577 6.012 6.012 0 0 1-.38-.128ZM15.75 3.75c.128.038.256.08.38.128a.75.75 0 0 0 .484.577l.402 3.285a.75.75 0 0 1-.236.656l-2.44 2.148a.75.75 0 0 1-.9.058L10.48 8.745a.748.748 0 0 1-.3-.89 11.985 11.985 0 0 1 5.57-4.105Z" /></svg>
          </button>
          <button
            class="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow hover:bg-emerald-600"
            title="Atender"
            @click="aceitarChamadaRecebida"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-7 w-7"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Adicionar usuário à chamada ativa -->
    <div v-if="modalAdicionarUsuario" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div class="w-full max-w-md rounded-xl bg-white p-4">
        <h3 class="mb-3 text-lg font-semibold text-slate-800">Adicionar &agrave; chamada</h3>

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
import { computed, nextTick, onMounted, onUnmounted, ref, watch, type Directive, createApp, type App as VueApp } from 'vue'
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'
import { useCallStore } from './stores/call'
import type { ConteudoMensagem, Mensagem, TipoChamada } from './types/api'
import { getAttachmentUrl } from './services/http'
import { pinia } from './pinia'
import CallWindow from './CallWindow.vue'

const auth = useAuthStore()
const chat = useChatStore()
const call = useCallStore()

const vSrcObject: Directive<HTMLMediaElement, MediaStream | null> = {
  mounted(el, binding) {
    if (binding.value) el.srcObject = binding.value
  },
  updated(el, binding) {
    if (el.srcObject !== binding.value) el.srcObject = binding.value
  }
}

const login = ref('')
const senha = ref('')
const carregandoLogin = ref(false)
const erro = ref('')

const filtroContato = ref('')
const filtroConversa = ref('')
const buscaNoChat = ref('')

const textoMensagem = ref('')
const mostrarEmoji = ref(false)
const inputArquivo = ref<HTMLInputElement | null>(null)
const mensagensContainer = ref<HTMLDivElement | null>(null)
const usuarioNoFimDoChat = ref(true)
const anexosUrl = ref<Record<string, string>>({})
const anexosCarregando = new Set<string>()
const forcarScrollImagemAteFinal = ref(false)
const imagemTelaCheiaAberta = ref(false)
const imagemTelaCheiaUrl = ref('')
const imagemTelaCheiaNome = ref('Imagem')
const zoomImagemTelaCheia = ref(1)
const previewImagemAberta = ref(false)
const previewImagemUrl = ref('')
const previewImagemNome = ref('imagem.png')
const previewImagemMime = ref('image/png')
const previewImagemBlob = ref<Blob | null>(null)
const posicionandoAberturaConversa = ref(false)
let frameValidacaoVisualizacao = 0

const gravandoAudio = ref(false)
const mediaRecorder = ref<MediaRecorder | null>(null)
const audioStream = ref<MediaStream | null>(null)
let audioChunks: BlobPart[] = []

const abrirModalGrupo = ref(false)
const nomeGrupo = ref('')
const membrosGrupo = ref<number[]>([])
const erroGrupo = ref('')

const modalParticipantesChamada = ref(false)
const participantesSelecionados = ref<number[]>([])
const tipoChamadaPendente = ref<TipoChamada>(1)
const comTelaPendente = ref(false)
const modalAdicionarUsuario = ref(false)
const usuariosParaAdicionar = ref<number[]>([])

// Popup window
const janelaChamada = ref<Window | null>(null)
let appPopup: VueApp | null = null

// Ringtone (Web Audio API)
let toqueAudioCtx: AudioContext | null = null
let toqueInterval: number | null = null

const emojis =[0x1F600,0x1F601,0x1F602,0x1F923,0x1F60A,0x1F60D,0x1F60E,0x1F622,0x1F621,0x1F44D,0x1F64F,0x2764].map((code) => String.fromCodePoint(code))

const contatosFiltrados = computed(() => {
  const termo = filtroContato.value.trim().toLowerCase()
  if (!termo) {
    return chat.contatos
  }

  return chat.contatos.filter((item) => {
    return (
      item.nome.toLowerCase().includes(termo) ||
      item.login.toLowerCase().includes(termo) ||
      item.email.toLowerCase().includes(termo)
    )
  })
})

const conversasFiltradas = computed(() => {
  const termo = filtroConversa.value.trim().toLowerCase()
  if (!termo) {
    return chat.conversas
  }

  return chat.conversas.filter((item) => {
    const titulo = (item.descricao || item.nome || '').toLowerCase()
    const ultima = (item.ultima_mensagem_texto || '').toLowerCase()
    return titulo.includes(termo) || ultima.includes(termo)
  })
})

type ItemMensagemView =
  | { tipo: 'dia'; key: string; label: string }
  | { tipo: 'mensagem'; key: string; mensagem: Mensagem }

const itensMensagens = computed<ItemMensagemView[]>(() => {
  const itens: ItemMensagemView[] = []
  let diaAtual = ''

  for (const mensagem of chat.mensagensAtivas) {
    const data = new Date(mensagem.inserida)
    const diaChave = Number.isNaN(data.getTime()) ? 'sem-data' : data.toISOString().slice(0, 10)

    if (diaChave !== diaAtual) {
      diaAtual = diaChave
      itens.push({
        tipo: 'dia',
        key: `dia-${diaChave}`,
        label: formatarDiaSeparador(mensagem.inserida)
      })
    }

    itens.push({
      tipo: 'mensagem',
      key: `msg-${mensagem.id}`,
      mensagem
    })
  }

  return itens
})

onMounted(async () => {
  window.addEventListener('keydown', aoTeclaGlobal)

  if (auth.isAuthenticated) {
    try {
      await chat.inicializar()
      chat.registrarHandlerChamada((evento) => {
        void call.tratarEventoChamada(evento)
      })
      await posicionarAberturaConversaAtiva()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao iniciar sess\u00E3o'
      erro.value = message
      auth.logout()
    }
  }
})

onUnmounted(() => {
  if (frameValidacaoVisualizacao) {
    cancelAnimationFrame(frameValidacaoVisualizacao)
    frameValidacaoVisualizacao = 0
  }
  window.removeEventListener('keydown', aoTeclaGlobal)
  document.body.style.overflow = ''
  fecharJanelaChamada()
  pararToque()
  chat.removerHandlerChamada()
  call.encerrarChamada()
  chat.encerrarTempoReal()
  encerrarStreamAudio()
  for (const url of Object.values(anexosUrl.value)) {
    URL.revokeObjectURL(url)
  }
  if (previewImagemUrl.value) {
    URL.revokeObjectURL(previewImagemUrl.value)
  }
  anexosUrl.value = {}
})

function atualizarBloqueioScrollModal() {
  document.body.style.overflow = imagemTelaCheiaAberta.value || previewImagemAberta.value ? 'hidden' : ''
}

watch(imagemTelaCheiaAberta, atualizarBloqueioScrollModal)
watch(previewImagemAberta, atualizarBloqueioScrollModal)

async function fazerLogin() {
  erro.value = ''
  carregandoLogin.value = true

  try {
    await auth.login(login.value.trim(), senha.value)
    await chat.inicializar()
    chat.registrarHandlerChamada((evento) => {
      void call.tratarEventoChamada(evento)
    })
    await posicionarAberturaConversaAtiva()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao efetuar login'
  } finally {
    carregandoLogin.value = false
  }
}

function sair() {
  fecharJanelaChamada()
  pararToque()
  call.encerrarChamada()
  chat.removerHandlerChamada()
  chat.encerrarTempoReal()
  auth.logout()
}

async function abrirConversaContato(contatoId: number) {
  const contato = chat.contatos.find((item) => item.id === contatoId)
  if (!contato) {
    return
  }

  try {
    await chat.iniciarConversaDireta(contato)
    await posicionarAberturaConversaAtiva()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao abrir conversa'
  }
}

async function abrirConversa(conversaId: number) {
  try {
    await chat.selecionarConversa(conversaId)
    await posicionarAberturaConversaAtiva()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao abrir conversa'
  }
}

async function enviarTexto() {
  const texto = textoMensagem.value.trim()
  if (!texto) {
    return
  }

  try {
    await chat.enviarTexto(texto)
    textoMensagem.value = ''
    await nextTick()
    rolarParaFinal()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao enviar texto'
  }
}

function inserirEmoji(emoji: string) {
  textoMensagem.value = `${textoMensagem.value}${emoji}`
  mostrarEmoji.value = false
}

async function selecionarArquivo(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    return
  }
  const isImagem = file.type.startsWith('image/')

  try {
    if (isImagem) {
      abrirPreviewImagem(file, file.name, file.type || 'image/png')
      return
    }
    await chat.enviarArquivo(file, file.name, file.type, false)
    await nextTick()
    rolarParaFinal()
  } catch (e) {
    if (isImagem) {
      forcarScrollImagemAteFinal.value = false
    }
    erro.value = e instanceof Error ? e.message : 'Erro ao enviar arquivo'
  } finally {
    target.value = ''
  }
}

async function garantirAnexoUrl(identificador: string) {
  if (!identificador || anexosUrl.value[identificador] || anexosCarregando.has(identificador)) {
    return
  }

  anexosCarregando.add(identificador)
  try {
    const resposta = await fetch(getAttachmentUrl(identificador), {
      headers: {
        Authorization: `Bearer ${auth.token}`
      }
    })

    if (!resposta.ok) {
      throw new Error(`Erro ao obter anexo: HTTP ${resposta.status}`)
    }

    const blob = await resposta.blob()
    const url = URL.createObjectURL(blob)
    anexosUrl.value = {
      ...anexosUrl.value,
      [identificador]: url
    }
  } finally {
    anexosCarregando.delete(identificador)
  }
}

function anexoUrl(identificador: string) {
  if (!anexosUrl.value[identificador]) {
    void garantirAnexoUrl(identificador)
  }
  return anexosUrl.value[identificador] || ''
}

function aoCarregarImagemNoChat() {
  if (!forcarScrollImagemAteFinal.value && !usuarioNoFimDoChat.value) {
    return
  }

  void nextTick().then(() => {
    rolarParaFinal()
    atualizarPosicaoScroll()
    forcarScrollImagemAteFinal.value = false
  })
}

async function abrirAnexo(identificador: string, nome = 'Arquivo') {
  try {
    await garantirAnexoUrl(identificador)
    const url = anexosUrl.value[identificador]
    if (!url) {
      return
    }

    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.download = nome
    link.click()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao abrir anexo'
  }
}

function ajustarZoomImagem(delta: number) {
  const novoZoom = Math.min(5, Math.max(1, zoomImagemTelaCheia.value + delta))
  zoomImagemTelaCheia.value = Number(novoZoom.toFixed(2))
}

function zoomImagemPorRoda(event: WheelEvent) {
  ajustarZoomImagem(event.deltaY < 0 ? 0.2 : -0.2)
}

async function abrirImagemTelaCheia(identificador: string, nome = 'Imagem') {
  try {
    await garantirAnexoUrl(identificador)
    const url = anexosUrl.value[identificador]
    if (!url) {
      return
    }

    imagemTelaCheiaUrl.value = url
    imagemTelaCheiaNome.value = nome
    zoomImagemTelaCheia.value = 1
    imagemTelaCheiaAberta.value = true
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao abrir imagem'
  }
}

function fecharImagemTelaCheia() {
  imagemTelaCheiaAberta.value = false
  zoomImagemTelaCheia.value = 1
}

function aoTeclaGlobal(event: KeyboardEvent) {
  if (!imagemTelaCheiaAberta.value) {
    return
  }

  if (event.key === 'Escape') {
    fecharImagemTelaCheia()
    return
  }

  if (event.key === '+' || event.key === '=') {
    ajustarZoomImagem(0.2)
    return
  }

  if (event.key === '-') {
    ajustarZoomImagem(-0.2)
  }
}

async function iniciarAudio() {
  if (gravandoAudio.value) {
    return
  }

  if (!window.isSecureContext) {
    erro.value = 'Para gravar áudio por navegador, use HTTPS (ou localhost).'
    return
  }

  if (!navigator.mediaDevices || !window.MediaRecorder) {
    erro.value = 'Grava\u00E7\u00E3o de \u00E1udio n\u00E3o suportada neste navegador.'
    return
  }

  try {
    audioStream.value = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(audioStream.value)
    audioChunks = []

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    recorder.onstop = async () => {
      if (!audioChunks.length) {
        encerrarStreamAudio()
        return
      }

      const mime = recorder.mimeType || 'audio/webm'
      const blob = new Blob(audioChunks, { type: mime })
      const extension = mime.includes('ogg') ? 'ogg' : 'webm'
      const nome = `audio-${Date.now()}.${extension}`

      try {
        await chat.enviarArquivo(blob, nome, mime, true)
        await nextTick()
        rolarParaFinal()
      } catch (e) {
        erro.value = e instanceof Error ? e.message : 'Erro ao enviar \u00E1udio'
      } finally {
        encerrarStreamAudio()
      }
    }

    recorder.start()
    mediaRecorder.value = recorder
    gravandoAudio.value = true
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'N\u00E3o foi poss\u00EDvel iniciar a grava\u00E7\u00E3o'
    encerrarStreamAudio()
  }
}

function pararAudio() {
  if (!gravandoAudio.value) {
    return
  }

  gravandoAudio.value = false
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
  }
}

function encerrarStreamAudio() {
  if (audioStream.value) {
    audioStream.value.getTracks().forEach((track) => track.stop())
  }
  audioStream.value = null
  mediaRecorder.value = null
  gravandoAudio.value = false
}

async function pesquisarNoChat() {
  try {
    await chat.buscarNaConversa(buscaNoChat.value)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao pesquisar conversa'
  }
}

function resumoMensagem(item: Mensagem): string {
  const texto = item.conteudos.find((c) => c.tipo === 1)?.conteudo
  if (texto) {
    return texto
  }
  if (item.conteudos.some((c) => c.tipo === 2)) {
    return 'Imagem'
  }
  if (item.conteudos.some((c) => c.tipo === 4)) {
    return '\u00C1udio'
  }
  return 'Arquivo'
}

function normalizarExtensaoArquivo(conteudo: ConteudoMensagem): string {
  const extBruta = conteudo.extensao || (conteudo.nome?.split('.').pop() || '')
  return extBruta.trim().toLowerCase().replace(/^\./, '')
}

function isVideoConteudo(conteudo: ConteudoMensagem): boolean {
  const ext = normalizarExtensaoArquivo(conteudo)
  return ['mp4', 'webm', 'ogg', 'mov', 'm4v', 'mkv'].includes(ext)
}

function isMensagemSoEmoji(texto: string): boolean {
  const valor = texto.trim()
  if (!valor) {
    return false
  }

  const somenteEmojiOuSeparador = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D\u{1F3FB}-\u{1F3FF}\s]+$/u
  const temEmoji = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u

  return somenteEmojiOuSeparador.test(valor) && temEmoji.test(valor)
}

function classeTextoMensagem(texto: string): string {
  return isMensagemSoEmoji(texto) ? 'text-4xl leading-tight' : 'text-sm'
}

function statusEntrega(mensagem: Mensagem): string {
  const check = String.fromCharCode(10003)
  const checkDuplo = check + check

  if (mensagem.visualizada) {
    return checkDuplo
  }
  if (mensagem.recebida) {
    return checkDuplo
  }
  return check
}

function statusEntregaClasse(mensagem: Mensagem): string {
  if (mensagem.visualizada) {
    return 'text-sky-300'
  }
  return 'text-slate-300'
}

function irParaMensagem(mensagemId: number) {
  const node = document.getElementById(`msg-${mensagemId}`)
  if (!node) {
    return
  }
  node.scrollIntoView({ behavior: 'smooth', block: 'center' })
  ;(node as HTMLElement).classList.add('ring-2', 'ring-amber-400')
  window.setTimeout(() => {
    ;(node as HTMLElement).classList.remove('ring-2', 'ring-amber-400')
  }, 1200)
}

function rolarParaFinal() {
  if (!mensagensContainer.value) {
    return
  }
  mensagensContainer.value.scrollTop = mensagensContainer.value.scrollHeight
}

async function rolarParaFinalGarantido() {
  rolarParaFinal()
  await nextTick()
  rolarParaFinal()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  rolarParaFinal()
  await new Promise<void>((resolve) => setTimeout(resolve, 60))
  rolarParaFinal()
}

function rolarMensagemParaVisibilidadeCompleta(mensagemId: number) {
  const container = mensagensContainer.value
  const node = document.getElementById(`msg-${mensagemId}`)
  if (!container || !node) {
    return
  }

  const margem = 8
  const cRect = container.getBoundingClientRect()
  const mRect = node.getBoundingClientRect()

  if (mRect.height > container.clientHeight) {
    container.scrollTop += mRect.top - cRect.top - margem
    return
  }

  if (mRect.top < cRect.top + margem) {
    container.scrollTop += mRect.top - cRect.top - margem
    return
  }

  if (mRect.bottom > cRect.bottom - margem) {
    container.scrollTop += mRect.bottom - cRect.bottom + margem
  }
}

function abrirPreviewImagem(blob: Blob, nome: string, mime: string) {
  if (previewImagemUrl.value) {
    URL.revokeObjectURL(previewImagemUrl.value)
  }
  previewImagemBlob.value = blob
  previewImagemNome.value = nome
  previewImagemMime.value = mime || 'image/png'
  previewImagemUrl.value = URL.createObjectURL(blob)
  previewImagemAberta.value = true
}

function fecharPreviewImagem() {
  previewImagemAberta.value = false
  if (previewImagemUrl.value) {
    URL.revokeObjectURL(previewImagemUrl.value)
  }
  previewImagemUrl.value = ''
  previewImagemNome.value = 'imagem.png'
  previewImagemMime.value = 'image/png'
  previewImagemBlob.value = null
}

async function confirmarEnvioPreviewImagem() {
  if (!previewImagemBlob.value) {
    return
  }

  try {
    forcarScrollImagemAteFinal.value = true
    await chat.enviarArquivo(previewImagemBlob.value, previewImagemNome.value, previewImagemMime.value, false)
    fecharPreviewImagem()
    await nextTick()
    rolarParaFinal()
  } catch (e) {
    forcarScrollImagemAteFinal.value = false
    erro.value = e instanceof Error ? e.message : 'Erro ao enviar imagem'
  }
}

function extensaoPorMime(mime: string): string {
  const tipo = mime.toLowerCase()
  if (tipo.includes('png')) return 'png'
  if (tipo.includes('jpeg') || tipo.includes('jpg')) return 'jpg'
  if (tipo.includes('webp')) return 'webp'
  if (tipo.includes('gif')) return 'gif'
  if (tipo.includes('bmp')) return 'bmp'
  return 'png'
}

async function aoColarNoChat(event: ClipboardEvent) {
  if (!chat.conversaAtivaId) {
    return
  }

  const items = event.clipboardData?.items
  if (!items || items.length === 0) {
    return
  }

  for (const item of items) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) {
      continue
    }

    const arquivo = item.getAsFile()
    if (!arquivo) {
      continue
    }

    event.preventDefault()
    const ext = extensaoPorMime(arquivo.type || 'image/png')
    const nome = `print-${Date.now()}.${ext}`

    try {
      abrirPreviewImagem(arquivo, nome, arquivo.type || 'image/png')
    } catch (e) {
      erro.value = e instanceof Error ? e.message : 'Erro ao colar imagem'
    }
    return
  }
}

function rolarMensagemParaFim(mensagemId: number) {
  const node = document.getElementById(`msg-${mensagemId}`)
  if (!node) {
    return
  }
  node.scrollIntoView({ block: 'end', behavior: 'auto' })
}

async function posicionarAberturaConversaAtiva() {
  if (!chat.conversaAtivaId || chat.mensagensAtivas.length === 0) {
    return
  }

  posicionandoAberturaConversa.value = true
  try {
    const usuarioId = auth.user?.id
    const primeiraNaoLida = chat.mensagensAtivas.find((mensagem) => {
      return mensagem.remetente_id !== usuarioId && !mensagem.visualizada
    })

    await nextTick()
    if (primeiraNaoLida) {
      rolarMensagemParaVisibilidadeCompleta(primeiraNaoLida.id)
    } else {
      await rolarParaFinalGarantido()
    }

    await nextTick()
    atualizarPosicaoScroll()
    solicitarValidacaoVisualizacao()
  } finally {
    posicionandoAberturaConversa.value = false
  }
}

function aoScrollChat() {
  atualizarPosicaoScroll()
  solicitarValidacaoVisualizacao()
}

function atualizarPosicaoScroll() {
  if (!mensagensContainer.value) {
    usuarioNoFimDoChat.value = true
    return
  }

  const container = mensagensContainer.value
  const margem = 56
  usuarioNoFimDoChat.value =
    container.scrollTop + container.clientHeight >= container.scrollHeight - margem
}

function solicitarValidacaoVisualizacao() {
  if (frameValidacaoVisualizacao) {
    cancelAnimationFrame(frameValidacaoVisualizacao)
  }
  frameValidacaoVisualizacao = requestAnimationFrame(() => {
    frameValidacaoVisualizacao = 0
    void validarMensagensCompletamenteVisiveis()
  })
}

async function validarMensagensCompletamenteVisiveis() {
  const conversaId = chat.conversaAtivaId
  const usuarioId = auth.user?.id
  const container = mensagensContainer.value

  if (!conversaId || !usuarioId || !container) {
    return
  }

  const limite = container.getBoundingClientRect()
  const idsVisiveis: number[] = []

  for (const mensagem of chat.mensagensAtivas) {
    if (mensagem.remetente_id === usuarioId || mensagem.visualizada) {
      continue
    }

    const node = document.getElementById(`msg-${mensagem.id}`)
    if (!node) {
      continue
    }

    const box = node.getBoundingClientRect()
    const totalmenteVisivel = box.top >= limite.top && box.bottom <= limite.bottom
    if (totalmenteVisivel) {
      idsVisiveis.push(mensagem.id)
    }
  }

  if (idsVisiveis.length > 0) {
    await chat.marcarMensagensComoVisualizadas(conversaId, idsVisiveis)
  }
}

function formatarHora(iso: string) {
  if (!iso) {
    return ''
  }
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatarDiaSeparador(iso: string) {
  if (!iso) {
    return ''
  }
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function cancelarGrupo() {
  abrirModalGrupo.value = false
  nomeGrupo.value = ''
  membrosGrupo.value = []
  erroGrupo.value = ''
}

async function confirmarGrupo() {
  erroGrupo.value = ''

  if (!nomeGrupo.value.trim()) {
    erroGrupo.value = 'Informe o nome do grupo.'
    return
  }

  if (membrosGrupo.value.length === 0) {
    erroGrupo.value = 'Selecione ao menos um usu\u00E1rio.'
    return
  }

  try {
    await chat.criarGrupo(nomeGrupo.value.trim(), membrosGrupo.value)
    cancelarGrupo()
    await posicionarAberturaConversaAtiva()
  } catch (e) {
    erroGrupo.value = e instanceof Error ? e.message : 'Erro ao criar grupo'
  }
}

// === Chamada (Call) ===

function solicitarChamada(tipo: TipoChamada, comTela = false) {
  if (!chat.conversaAtiva) return

  if (chat.conversaAtiva.tipo === 1 && chat.conversaAtiva.destinatario_id) {
    void iniciarChamadaDireta(tipo, chat.conversaAtiva.destinatario_id, comTela)
  } else if (chat.conversaAtiva.tipo === 2) {
    tipoChamadaPendente.value = tipo
    comTelaPendente.value = comTela
    participantesSelecionados.value = []
    modalParticipantesChamada.value = true
  }
}

async function iniciarChamadaDireta(tipo: TipoChamada, destinatarioId: number, comTela = false) {
  if (!auth.user) return
  try {
    await call.iniciarChamada(tipo, [{ id: auth.user.id }, { id: destinatarioId }], comTela)
    if (tipo === 2) {
      abrirJanelaChamada()
    }
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao iniciar chamada'
  }
}

function cancelarModalParticipantes() {
  modalParticipantesChamada.value = false
  participantesSelecionados.value = []
  comTelaPendente.value = false
}

async function confirmarChamadaGrupo() {
  if (!auth.user || participantesSelecionados.value.length === 0) return

  const usuarios = [
    { id: auth.user.id },
    ...participantesSelecionados.value.map(id => ({ id }))
  ]

  modalParticipantesChamada.value = false
  participantesSelecionados.value = []

  try {
    await call.iniciarChamada(tipoChamadaPendente.value, usuarios, comTelaPendente.value)
    if (tipoChamadaPendente.value === 2) {
      abrirJanelaChamada()
    }
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao iniciar chamada'
  }
}

async function aceitarChamadaRecebida() {
  pararToque()
  const tipo = call.tipoChamada
  try {
    await call.aceitarChamada()
    if (tipo === 2) {
      abrirJanelaChamada()
    }
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao aceitar chamada'
  }
}

function recusarChamadaRecebida() {
  pararToque()
  void call.recusarChamada()
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
    erro.value = e instanceof Error ? e.message : 'Erro ao adicionar usu\u00E1rio'
  } finally {
    cancelarAdicionarUsuario()
  }
}

function sairDaChamadaAtual() {
  fecharJanelaChamada()
  if (call.estado === 'chamando') {
    void call.cancelarChamada()
  } else {
    void call.sairDaChamada()
  }
}

function iniciaisUsuario(nome: string): string {
  return nome
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// --- Popup window management ---

function abrirJanelaChamada() {
  if (janelaChamada.value && !janelaChamada.value.closed) {
    janelaChamada.value.focus()
    return
  }

  const popup = window.open('', 'conversa-chamada', 'width=800,height=600,resizable=yes')
  if (!popup) {
    // Popup bloqueado - fallback silencioso
    return
  }

  janelaChamada.value = popup

  // Copy CSS from parent
  popup.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Chamada</title>')
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    popup.document.write(link.outerHTML)
  }
  for (const style of document.querySelectorAll('style')) {
    popup.document.write(style.outerHTML)
  }
  popup.document.write('</head><body><div id="call-app"></div></body></html>')
  popup.document.close()

  // Wait for CSS to load, then mount Vue app
  popup.addEventListener('DOMContentLoaded', () => mountPopupApp(popup))
  // Fallback if DOMContentLoaded already fired
  if (popup.document.readyState !== 'loading') {
    mountPopupApp(popup)
  }

  popup.addEventListener('beforeunload', () => {
    fecharJanelaChamada(false)
  })
}

function mountPopupApp(popup: Window) {
  const container = popup.document.getElementById('call-app')
  if (!container || appPopup) return

  appPopup = createApp(CallWindow)
  appPopup.use(pinia)
  appPopup.mount(container)
}

function fecharJanelaChamada(fecharPopup = true) {
  if (appPopup) {
    appPopup.unmount()
    appPopup = null
  }
  if (fecharPopup && janelaChamada.value && !janelaChamada.value.closed) {
    janelaChamada.value.close()
  }
  janelaChamada.value = null
}

// --- Ringtone (Web Audio API) ---

function iniciarToque() {
  if (toqueAudioCtx) return
  toqueAudioCtx = new AudioContext()

  function tocar() {
    if (!toqueAudioCtx) return
    const osc = toqueAudioCtx.createOscillator()
    const gain = toqueAudioCtx.createGain()
    osc.connect(gain)
    gain.connect(toqueAudioCtx.destination)
    osc.frequency.value = 440
    gain.gain.value = 0.3
    osc.start()
    setTimeout(() => { osc.stop(); osc.disconnect(); gain.disconnect() }, 1000)
  }

  tocar()
  toqueInterval = window.setInterval(tocar, 3000)
}

function pararToque() {
  if (toqueInterval) { clearInterval(toqueInterval); toqueInterval = null }
  if (toqueAudioCtx) { toqueAudioCtx.close(); toqueAudioCtx = null }
}

// Watch ringtone
watch(() => call.recebendoChamada, (recebendo) => {
  if (recebendo) {
    iniciarToque()
  } else {
    pararToque()
  }
})

// Watch call end to close popup
watch(() => call.emChamada, (em) => {
  if (!em) {
    fecharJanelaChamada()
    pararToque()
  }
})

// --- Upgrade audio -> video ---

async function upgradeParaVideoUI() {
  try {
    await call.upgradeParaVideo()
    abrirJanelaChamada()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao ativar v\u00EDdeo'
  }
}

watch(
  () => chat.mensagensAtivas.map((mensagem) => mensagem.id),
  async (atual, anterior) => {
    if (posicionandoAberturaConversa.value) {
      return
    }

    solicitarValidacaoVisualizacao()

    const estavaNoFim = usuarioNoFimDoChat.value
    const ultimoIdAnterior = anterior[anterior.length - 1] || 0
    const ultimoIdAtual = atual[atual.length - 1] || 0
    if (!ultimoIdAtual || ultimoIdAtual === ultimoIdAnterior) {
      return
    }

    const ultimaMensagem = chat.mensagensAtivas[chat.mensagensAtivas.length - 1]
    const recebidaDeOutroUsuario = !!ultimaMensagem && ultimaMensagem.remetente_id !== auth.user?.id
    if (!recebidaDeOutroUsuario || !estavaNoFim) {
      return
    }

    await nextTick()
    rolarParaFinal()
    await nextTick()
    atualizarPosicaoScroll()
  }
)
</script>
