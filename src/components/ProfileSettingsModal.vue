<template>
  <div v-if="aberta" :class="inline ? 'flex flex-1 items-start justify-start' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3'">
    <div :class="inline ? 'flex h-full w-full max-w-5xl flex-col overflow-hidden bg-surface-base md:flex-row' : 'settings-modal relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-surface-base shadow-2xl md:h-[760px] md:flex-row'">
    <button
      v-if="!inline"
      class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-lg text-surface-500 transition hover:bg-surface-100 hover:text-surface-800"
      @click="fechar"
    >
      &times;
    </button>
      <aside
        class="border-b border-surface-200 bg-surface-50 md:w-72 md:shrink-0 md:border-b-0 md:border-r"
        :class="subnivelMobile ? 'hidden md:block' : ''"
      >
        <div class="border-b border-surface-200 p-5" :class="inline ? '' : 'pr-16'">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-surface-500">Configuracoes</p>
            <h2 class="mt-1 text-lg font-semibold text-surface-900">Preferencias da conta</h2>
          </div>
        </div>

        <div class="p-3">
          <template v-for="secao in secoes" :key="secao.titulo">
            <p v-if="secoes.length > 1" class="mb-2 mt-3 px-4 text-xs font-semibold uppercase tracking-wide text-surface-500 first:mt-0">{{ secao.titulo }}</p>
            <button
              v-for="grupo in secao.grupos"
              :key="grupo.id"
              type="button"
              class="mb-2 w-full rounded-xl px-4 py-3 text-left transition"
              :class="grupoAtual?.id === grupo.id ? 'bg-primary-600 text-white shadow-lg' : 'text-surface-600 hover:bg-surface-200 hover:text-surface-900'"
              @click="selecionarAba(grupo.abas[0]!.id)"
            >
              <span class="block text-sm font-semibold">{{ grupo.titulo }}</span>
              <span class="mt-1 block truncate text-xs opacity-80">{{ grupo.descricao }}</span>
            </button>
          </template>
        </div>
      </aside>

      <section
        class="flex min-h-0 flex-1 flex-col"
        :class="!subnivelMobile ? 'hidden md:flex' : ''"
      >
        <div class="border-b border-surface-200 px-5 py-4">
          <div class="flex items-center gap-3">
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-200 md:hidden"
              @click="voltarMenuMobile"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5 text-surface-600"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            </button>
            <div>
              <h3 class="text-base font-semibold text-surface-900">{{ grupoAtual?.titulo }}</h3>
              <p class="mt-1 text-sm text-surface-500">{{ abaAtual?.descricao }}</p>
            </div>
          </div>
          <div v-if="grupoAtual && grupoAtual.abas.length > 1" class="-mb-4 mt-3 flex gap-1 overflow-x-auto">
            <button
              v-for="aba in grupoAtual.abas"
              :key="aba.id"
              type="button"
              data-subaba
              class="shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition"
              :class="props.abaAtiva === aba.id ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400' : 'border-transparent text-surface-500 hover:text-surface-800'"
              @click="selecionarAba(aba.id)"
            >
              {{ aba.titulo }}
            </button>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div v-if="props.abaAtiva === 'usuario'" class="space-y-6">
            <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
              <div class="flex flex-col gap-4 md:flex-row md:items-center">
                <div class="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-2xl font-semibold text-primary-700">
                  <!-- key pela URL: ao renovar a URL vencida nasce outra <img>, sem o display:none -->
                  <img
                    v-if="avatarPreview || avatarAtual"
                    :key="avatarPreview || avatarAtual"
                    :src="avatarPreview || avatarAtual"
                    alt="Avatar"
                    class="h-full w-full object-cover"
                    @error="($event.target as HTMLImageElement).style.display = 'none'; auth.renovarAvatarExpirado(avatarAtual)"
                  />
                  <span v-if="!avatarPreview && !avatarAtual">{{ inicialUsuario }}</span>
                  <div
                    v-if="uploadProgresso > 0 && uploadProgresso < 100"
                    class="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-bold text-white"
                  >
                    {{ uploadProgresso }}%
                  </div>
                </div>

                <div class="min-w-0 flex-1">
                  <h4 class="text-sm font-semibold text-surface-800">Foto de perfil</h4>
                  <p class="mt-1 text-sm text-surface-500">Atualize o avatar exibido no chat e nas conversas.</p>

                  <p v-if="!auth.pode(CodigoPermissao.Avatar)" class="mt-3 text-xs text-surface-500">Você não tem permissão para mudar o avatar.</p>
                  <div v-else class="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                      :disabled="enviandoAvatar"
                      @click="inputAvatar?.click()"
                    >
                      {{ enviandoAvatar ? 'Enviando...' : 'Alterar foto' }}
                    </button>
                    <button
                      v-if="avatarAtual"
                      type="button"
                      class="rounded-lg border border-danger-300 dark:border-danger-700 px-3 py-2 text-sm font-medium text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-800 disabled:opacity-60"
                      :disabled="enviandoAvatar"
                      @click="removerAvatar"
                    >
                      Remover
                    </button>
                  </div>

                  <input
                    ref="inputAvatar"
                    type="file"
                    class="hidden"
                    accept="image/*"
                    @change="selecionarAvatar"
                  />
                  <p v-if="erroAvatar" class="mt-2 text-xs text-danger-600">{{ erroAvatar }}</p>
                </div>

                <div class="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    class="flex h-9 w-9 items-center justify-center rounded-lg text-danger-500 transition hover:bg-danger-50 hover:text-danger-600"
                    title="Sair"
                    @click="emit('logout')"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                  </button>
                </div>
              </div>
            </section>

            <EspacoUsado />

            <form class="space-y-4" @submit.prevent="salvarPerfil">
              <section class="rounded-2xl border border-surface-200 p-4">
                <div class="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 class="text-sm font-semibold text-surface-800">Dados do usuario</h4>
                    <p class="mt-1 text-sm text-surface-500">Nome e email visiveis na sua conta.</p>
                    <p v-if="desdeMim" class="mt-1 text-sm text-surface-500">{{ desdeMim }}</p>
                  </div>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-sm text-surface-700">Nome</label>
                    <input v-model.trim="nomeUsuario" type="text" :disabled="!auth.pode(CodigoPermissao.Nome)" :title="auth.pode(CodigoPermissao.Nome) ? undefined : 'Você não tem permissão para mudar o nome'" class="w-full rounded-xl border border-surface-300 px-3 py-2.5 text-sm bg-surface-100 outline-none focus:border-primary-500 text-surface-800 disabled:opacity-60" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm text-surface-700">Email</label>
                    <input v-model.trim="emailUsuario" type="email" :disabled="!auth.pode(CodigoPermissao.Email)" :title="auth.pode(CodigoPermissao.Email) ? undefined : 'Você não tem permissão para mudar o e-mail'" class="w-full rounded-xl border border-surface-300 px-3 py-2.5 text-sm bg-surface-100 outline-none focus:border-primary-500 text-surface-800 disabled:opacity-60" />
                  </div>
                </div>


                <p v-if="erroPerfil" class="mt-4 rounded-xl bg-danger-50 dark:bg-danger-900 px-3 py-2 text-sm text-danger-700 dark:text-danger-400">{{ erroPerfil }}</p>
                <p v-if="sucessoPerfil" class="mt-4 rounded-xl bg-success-50 dark:bg-success-900 px-3 py-2 text-sm text-success-700 dark:text-success-400">{{ sucessoPerfil }}</p>

                <div v-if="auth.pode(CodigoPermissao.Nome) || auth.pode(CodigoPermissao.Email)" class="mt-4 flex justify-end">
                  <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60" :disabled="salvandoPerfil">
                    {{ salvandoPerfil ? 'Salvando...' : 'Salvar dados' }}
                  </button>
                </div>
              </section>
            </form>

            <form v-if="auth.pode(CodigoPermissao.Senha)" class="space-y-3 rounded-2xl border border-surface-200 p-4" @submit.prevent="salvarSenha">
              <div>
                <h4 class="text-sm font-semibold text-surface-800">Senha</h4>
                <p class="mt-1 text-sm text-surface-500">Altere sua senha de acesso.</p>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="md:col-span-2 md:w-1/2 md:pr-2">
                  <label class="mb-1 block text-sm text-surface-700">Senha atual</label>
                  <input v-model="senhaAtual" type="password" autocomplete="current-password" class="w-full rounded-xl border border-surface-300 px-3 py-2.5 text-sm bg-surface-100 outline-none focus:border-primary-500 text-surface-800" />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-surface-700">Nova senha</label>
                  <input v-model="senhaNova" type="password" autocomplete="new-password" class="w-full rounded-xl border border-surface-300 px-3 py-2.5 text-sm bg-surface-100 outline-none focus:border-primary-500 text-surface-800" />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-surface-700">Confirmar nova senha</label>
                  <input v-model="confirmacaoSenha" type="password" autocomplete="new-password" class="w-full rounded-xl border border-surface-300 px-3 py-2.5 text-sm bg-surface-100 outline-none focus:border-primary-500 text-surface-800" />
                </div>
              </div>

              <p v-if="erro" class="rounded-xl bg-danger-50 dark:bg-danger-900 px-3 py-2 text-sm text-danger-700 dark:text-danger-400">{{ erro }}</p>
              <p v-if="sucesso" class="rounded-xl bg-success-50 dark:bg-success-900 px-3 py-2 text-sm text-success-700 dark:text-success-400">{{ sucesso }}</p>

              <div class="flex justify-end">
                <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60" :disabled="salvando">
                  {{ salvando ? 'Salvando...' : 'Salvar senha' }}
                </button>
              </div>
            </form>
          </div>

          <div v-else-if="props.abaAtiva === 'dispositivos'" class="space-y-4">
            <section class="rounded-2xl border border-surface-200 p-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h4 class="text-sm font-semibold text-surface-800">Sessao atual</h4>
                  <p class="mt-1 text-sm text-surface-500">Informacoes do navegador autenticado neste momento.</p>
                </div>
                <span class="rounded-full bg-success-100 dark:bg-success-900 px-2.5 py-1 text-xs font-semibold text-success-700 dark:text-success-400">Ativo</span>
              </div>

              <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div class="rounded-xl bg-surface-50 p-3">
                  <p class="text-xs uppercase tracking-wide text-surface-500">Dispositivo</p>
                  <p class="mt-1 text-sm font-medium text-surface-800">{{ dispositivoAtual.nome }}</p>
                </div>
                <div class="rounded-xl bg-surface-50 p-3">
                  <p class="text-xs uppercase tracking-wide text-surface-500">Modelo</p>
                  <p class="mt-1 text-sm font-medium text-surface-800">{{ dispositivoAtual.modelo }}</p>
                </div>
                <div class="rounded-xl bg-surface-50 p-3">
                  <p class="text-xs uppercase tracking-wide text-surface-500">Sistema</p>
                  <p class="mt-1 text-sm font-medium text-surface-800">{{ dispositivoAtual.versao_so }}</p>
                </div>
                <div class="rounded-xl bg-surface-50 p-3">
                  <p class="text-xs uppercase tracking-wide text-surface-500">Plataforma</p>
                  <p class="mt-1 text-sm font-medium text-surface-800">{{ dispositivoAtual.plataforma }}</p>
                </div>
              </div>
            </section>

            <section class="rounded-2xl border border-surface-200 p-4">
              <div class="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 class="text-sm font-semibold text-surface-800">Dispositivos de midia</h4>
                  <p class="mt-1 text-sm text-surface-500">Lista local de microfones, cameras e saidas detectadas pelo navegador.</p>
                </div>
                <button type="button" class="rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 disabled:opacity-60" :disabled="carregandoDispositivos" @click="carregarDispositivosMidia">
                  {{ carregandoDispositivos ? 'Atualizando...' : 'Atualizar lista' }}
                </button>
              </div>

              <p v-if="erroDispositivos" class="mb-4 rounded-xl bg-warning-50 dark:bg-warning-900 px-3 py-2 text-sm text-warning-700 dark:text-warning-400">{{ erroDispositivos }}</p>

              <div v-if="dispositivosMidia.length" class="space-y-3">
                <article
                  v-for="dispositivo in dispositivosMidia"
                  :key="dispositivo.id"
                  class="rounded-xl border p-3"
                  :class="dispositivo.variante === 'padrao'
                    ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:!bg-surface-50'
                    : 'border-surface-200 bg-surface-50'"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <p class="text-sm font-medium text-surface-800">{{ dispositivo.label }}</p>
                      <p class="mt-1 text-xs uppercase tracking-wide text-surface-500">{{ dispositivo.tipo }}</p>
                    </div>
                    <span
                      v-if="dispositivo.variante === 'padrao'"
                      class="shrink-0 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-semibold text-white"
                    >Padrao</span>
                    <span
                      v-else-if="dispositivo.variante === 'comunicacao'"
                      class="shrink-0 rounded-full bg-surface-300 dark:bg-surface-600 px-2 py-0.5 text-[10px] font-semibold text-surface-700 dark:text-surface-300"
                    >Comunicacao</span>
                  </div>
                </article>
              </div>

              <p v-else class="rounded-xl border border-dashed border-surface-300 px-4 py-6 bg-surface-100 text-sm text-surface-500">
                Nenhum dispositivo de midia foi identificado ainda. Se necessario, permita acesso a camera e microfone no navegador e atualize a lista.
              </p>
            </section>
          </div>

          <div v-else-if="props.abaAtiva === 'permissoes'" class="space-y-4">
            <section class="rounded-2xl border border-surface-200 p-4">
              <div class="mb-4">
                <h4 class="text-sm font-semibold text-surface-800">Permissoes do navegador</h4>
                <p class="mt-1 text-sm text-surface-500">Gerencie as permissoes necessarias para o funcionamento completo do aplicativo.</p>
              </div>

              <p v-if="carregandoPermissoes" class="rounded-xl bg-surface-100 px-3 py-2 text-sm text-surface-600">Verificando permissoes...</p>

              <div v-else class="space-y-3">
                <article v-for="perm in permissoes" :key="perm.nome" class="flex items-center justify-between gap-4 rounded-xl border border-surface-200 bg-surface-50 p-4">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-surface-800">{{ perm.nome }}</p>
                    <p class="mt-0.5 text-xs text-surface-500">{{ perm.descricao }}</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(perm.status)">
                      {{ statusLabel(perm.status) }}
                    </span>
                    <button
                      v-if="perm.solicitavel"
                      type="button"
                      class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                      @click="solicitarPermissao(perm)"
                    >
                      Solicitar
                    </button>
                  </div>
                </article>
              </div>

              <p class="mt-4 rounded-xl bg-surface-100 px-3 py-2 text-xs text-surface-500">
                Se uma permissao foi negada, pode ser necessario alterar manualmente nas configuracoes do navegador clicando no icone de cadeado na barra de endereco.
              </p>
            </section>
          </div>

          <ConfiguracaoPrivacidade v-else-if="props.abaAtiva === 'privacidade'" />

          <ConfiguracaoCores v-else-if="props.abaAtiva === 'cores'" />

          <ConfiguracaoChamadas v-else-if="props.abaAtiva === 'chamadas'" />

          <ConfiguracaoSistema v-else-if="props.abaAtiva === 'sistema'" />

          <ConfiguracaoSistema v-else-if="props.abaAtiva === 'ia'" parte="ia" />


          <ConfiguracaoBots v-else-if="props.abaAtiva === 'bots'" />

          <ConfiguracaoUsuarios v-else-if="props.abaAtiva === 'usuarios'" />

          <ConfiguracaoFerramentas v-else-if="props.abaAtiva === 'ferramentas'" />

          <ConfiguracaoConhecimento v-else-if="props.abaAtiva === 'conhecimento'" />

          <ConfiguracaoVoip v-else />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inicialNome, usuarioDesde } from '../utils/formatters'
import { computed, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import * as api from '../services/conversaApi'
import { useAuthStore } from '../stores/auth'
import { CodigoPermissao, TipoConteudo } from '../types/api'
import { redimensionarImagem } from '../utils/imageResize'
import ConfiguracaoCores from './ConfiguracaoCores.vue'
import ConfiguracaoPrivacidade from './ConfiguracaoPrivacidade.vue'
import ConfiguracaoChamadas from './ConfiguracaoChamadas.vue'
import ConfiguracaoSistema from './ConfiguracaoSistema.vue'
import ConfiguracaoBots from './ConfiguracaoBots.vue'
import ConfiguracaoUsuarios from './ConfiguracaoUsuarios.vue'
import EspacoUsado from './EspacoUsado.vue'
import ConfiguracaoFerramentas from './ConfiguracaoFerramentas.vue'
import ConfiguracaoConhecimento from './ConfiguracaoConhecimento.vue'
import ConfiguracaoVoip from './ConfiguracaoVoip.vue'

type AbaId = 'usuario' | 'privacidade' | 'dispositivos' | 'permissoes' | 'voip' | 'cores' | 'chamadas' | 'sistema' | 'acessos' | 'bots' | 'usuarios' | 'ferramentas' | 'conhecimento' | 'ia'

type DispositivoMidiaItem = {
  id: string
  label: string
  tipo: string
  variante?: 'padrao' | 'comunicacao'
}

const props = withDefaults(defineProps<{
  aberta: boolean
  inline?: boolean
  abaAtiva?: AbaId
}>(), {
  inline: false,
  abaAtiva: 'usuario'
})

const emit = defineEmits<{
  close: []
  logout: []
  'update:abaAtiva': [aba: AbaId]
}>()


const auth = useAuthStore()
const chat = useChatStore()
// A data do cadastro vem nos contatos, que o chat já carrega
const desdeMim = computed(() => usuarioDesde(chat.contatos.find((c) => c.id === auth.user?.id)?.criado_em))

type Aba = { id: AbaId; titulo: string; descricao: string; visivel?: () => boolean }
type Grupo = { id: string; titulo: string; descricao: string; admin?: boolean; abas: Aba[] }

const usa = (codigo: string) => () => auth.pode(codigo)
const administra = (codigo: string) => () => auth.temPermissao(codigo)

// Menus com as suas sub-abas; cada aba some sem a permissão (o servidor confere de novo)
const GRUPOS: Grupo[] = [
  { id: 'conta', titulo: 'Conta', descricao: 'Perfil, senha e privacidade', abas: [
    { id: 'usuario', titulo: 'Perfil', descricao: 'Nome, email, avatar e senha' },
    { id: 'privacidade', titulo: 'Privacidade', descricao: 'Status, visto por último e aparecer offline' },
  ] },
  { id: 'aparencia', titulo: 'Aparência', descricao: 'Tema claro ou escuro e cores', abas: [
    { id: 'cores', titulo: 'Tema', descricao: 'Tema claro ou escuro e cores do sistema, salvos neste navegador', visivel: usa(CodigoPermissao.Cores) },
  ] },
  { id: 'dispositivos', titulo: 'Dispositivos', descricao: 'Sessão, periféricos e permissões do navegador', abas: [
    { id: 'dispositivos', titulo: 'Sessão e periféricos', descricao: 'Sessao atual e perifericos locais' },
    { id: 'permissoes', titulo: 'Permissões do navegador', descricao: 'Notificacoes, microfone e camera' },
  ] },
  { id: 'chamadas', titulo: 'Chamadas', descricao: 'Qualidade das chamadas e telefonia', abas: [
    { id: 'chamadas', titulo: 'Qualidade', descricao: 'Qualidade do áudio, vídeo e tela', visivel: usa(CodigoPermissao.ConfigChamadas) },
    { id: 'voip', titulo: 'Voip', descricao: 'Seu ramal SIP, configurado pelo administrador', visivel: usa(CodigoPermissao.Telefonia) },
  ] },
  { id: 'sistema', titulo: 'Sistema', descricao: 'Configurações que valem para todos', admin: true, abas: [
    { id: 'sistema', titulo: 'Sistema', descricao: 'Configurações que valem para todos', visivel: administra(CodigoPermissao.Parametros) },
  ] },
  { id: 'pessoas', titulo: 'Pessoas', descricao: 'Usuários e o que cada um pode fazer', admin: true, abas: [
    { id: 'usuarios', titulo: 'Usuários', descricao: 'Cadastrar pessoas e bots e o que cada um pode fazer', visivel: administra(CodigoPermissao.Permissoes) },
  ] },
  { id: 'ia', titulo: 'IA', descricao: 'Bots, conhecimento, ferramentas e servidor', admin: true, abas: [
    // Bots: quem cria e quem cuida dos acessos (que vê todos)
    { id: 'bots', titulo: 'Bots', descricao: 'Bots de IA: instruções e o que cada um pode fazer', visivel: () => auth.temPermissao(CodigoPermissao.Bots) || auth.temPermissao(CodigoPermissao.Permissoes) },
    { id: 'conhecimento', titulo: 'Conhecimento', descricao: 'Documentos que os bots consultam', visivel: administra(CodigoPermissao.Conhecimento) },
    { id: 'ferramentas', titulo: 'Ferramentas', descricao: 'APIs externas que os bots podem chamar', visivel: administra(CodigoPermissao.Ferramentas) },
    { id: 'ia', titulo: 'Servidor', descricao: 'Servidor de IA e de embeddings', visivel: administra(CodigoPermissao.Parametros) },
  ] },
]

const grupos = computed(() => GRUPOS
  .map((grupo) => ({ ...grupo, abas: grupo.abas.filter((aba) => !aba.visivel || aba.visivel()) }))
  .filter((grupo) => grupo.abas.length > 0))

const secoes = computed(() => [
  { titulo: 'Pessoal', grupos: grupos.value.filter((grupo) => !grupo.admin) },
  { titulo: 'Administração', grupos: grupos.value.filter((grupo) => grupo.admin) },
].filter((secao) => secao.grupos.length > 0))

const abas = computed(() => grupos.value.flatMap((grupo) => grupo.abas))
const grupoAtual = computed(() => grupos.value.find((grupo) => grupo.abas.some((aba) => aba.id === props.abaAtiva)) || grupos.value[0])

// Aba restrita sem a permissão (link direto, ou permissão retirada): volta ao
// início, depois de saber as permissões
watch([() => props.abaAtiva, abas, () => auth.permissoesCarregadas], () => {
  // Acessos virou parte de Usuários: o endereço antigo leva para lá
  if (props.abaAtiva === 'acessos') {
    emit('update:abaAtiva', 'usuarios')
    return
  }
  if (auth.permissoesCarregadas && !abas.value.some((aba) => aba.id === props.abaAtiva)) emit('update:abaAtiva', 'usuario')
}, { immediate: true })

const subnivelMobile = ref<AbaId | null>(null)

function selecionarAba(id: AbaId) {
  emit('update:abaAtiva', id)
  subnivelMobile.value = id
}

function voltarMenuMobile() {
  subnivelMobile.value = null
}

const senhaAtual = ref('')
const senhaNova = ref('')
const confirmacaoSenha = ref('')
const erro = ref('')
const sucesso = ref('')
const salvando = ref(false)

const nomeUsuario = ref('')
const emailUsuario = ref('')
const erroPerfil = ref('')
const sucessoPerfil = ref('')
const salvandoPerfil = ref(false)

const inputAvatar = ref<HTMLInputElement | null>(null)
const avatarPreview = ref('')
const erroAvatar = ref('')
const enviandoAvatar = ref(false)
const uploadProgresso = ref(0)

const carregandoDispositivos = ref(false)
const erroDispositivos = ref('')
const dispositivosMidia = ref<DispositivoMidiaItem[]>([])

type PermissaoItem = {
  nome: string
  descricao: string
  status: 'granted' | 'denied' | 'prompt' | 'unavailable'
  solicitavel: boolean
}

const permissoes = ref<PermissaoItem[]>([])
const carregandoPermissoes = ref(false)



const avatarAtual = computed(() => auth.avatarUrl || '')
const inicialUsuario = computed(() => {
  const nome = auth.user?.nome?.trim() || auth.user?.login?.trim() || 'U'
  return inicialNome(nome)
})
const abaAtual = computed(() => abas.value.find((aba) => aba.id === props.abaAtiva) || abas.value[0])
const dispositivoAtual = computed(() => detectarNavegador())

watch(() => props.aberta, (aberta) => {
  if (!aberta) return
  resetarEstado()
  void carregarAoAbrir()
}, { immediate: true })

async function consultarPermissoes() {
  carregandoPermissoes.value = true
  const lista: PermissaoItem[] = []

  // Notificacoes
  if ('Notification' in window) {
    lista.push({
      nome: 'Notificacoes',
      descricao: 'Alertas de novas mensagens e chamadas recebidas',
      status: Notification.permission as 'granted' | 'denied' | 'prompt',
      solicitavel: Notification.permission === 'default',
    })
  } else {
    lista.push({
      nome: 'Notificacoes',
      descricao: 'Alertas de novas mensagens e chamadas recebidas',
      status: 'unavailable',
      solicitavel: false,
    })
  }

  // Microfone e Camera via Permissions API
  const permissionsApi = [
    { name: 'microphone' as PermissionName, nome: 'Microfone', descricao: 'Gravacao de audio e chamadas de voz' },
    { name: 'camera' as PermissionName, nome: 'Camera', descricao: 'Chamadas de video' },
  ]

  for (const perm of permissionsApi) {
    try {
      const result = await navigator.permissions.query({ name: perm.name })
      lista.push({
        nome: perm.nome,
        descricao: perm.descricao,
        status: result.state as 'granted' | 'denied' | 'prompt',
        solicitavel: result.state === 'prompt',
      })
    } catch {
      lista.push({
        nome: perm.nome,
        descricao: perm.descricao,
        status: 'prompt',
        solicitavel: true,
      })
    }
  }

  permissoes.value = lista
  carregandoPermissoes.value = false
}

async function solicitarPermissao(item: PermissaoItem) {
  try {
    if (item.nome === 'Notificacoes') {
      const resultado = await Notification.requestPermission()
      item.status = resultado === 'default' ? 'prompt' : resultado as 'granted' | 'denied'
      item.solicitavel = resultado === 'default'
    } else if (item.nome === 'Microfone') {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      item.status = 'granted'
      item.solicitavel = false
    } else if (item.nome === 'Camera') {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(t => t.stop())
      item.status = 'granted'
      item.solicitavel = false
    }
  } catch {
    item.status = 'denied'
    item.solicitavel = false
  }
  // Reconsulta para pegar estado real
  await consultarPermissoes()
}

function statusLabel(status: string) {
  if (status === 'granted') return 'Concedida'
  if (status === 'denied') return 'Negada'
  if (status === 'prompt') return 'Nao solicitada'
  return 'Indisponivel'
}

function statusClass(status: string) {
  if (status === 'granted') return 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-400'
  if (status === 'denied') return 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-400'
  if (status === 'prompt') return 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-400'
  return 'bg-surface-100 text-surface-500'
}

async function carregarAoAbrir() {
  await Promise.all([
    carregarDispositivosMidia(),
    consultarPermissoes(),
  ])
}

function detectarNavegador() {
  const ua = navigator.userAgent
  let nome = 'Navegador web'
  let versao = ''

  if (ua.includes('Firefox/')) {
    nome = 'Firefox'
    versao = ua.match(/Firefox\/([\d.]+)/)?.[1] || ''
  } else if (ua.includes('Edg/')) {
    nome = 'Edge'
    versao = ua.match(/Edg\/([\d.]+)/)?.[1] || ''
  } else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) {
    nome = 'Chrome'
    versao = ua.match(/Chrome\/([\d.]+)/)?.[1] || ''
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    nome = 'Safari'
    versao = ua.match(/Version\/([\d.]+)/)?.[1] || ''
  }
  if (versao) nome += ' ' + versao

  let versao_so = 'Sistema nao identificado'
  if (ua.includes('Windows NT 10')) versao_so = 'Windows 10/11'
  else if (ua.includes('Windows NT')) versao_so = 'Windows'
  else if (ua.includes('Mac OS X')) versao_so = 'macOS'
  else if (ua.includes('Android')) versao_so = 'Android'
  else if (/iPhone|iPad/.test(ua)) versao_so = 'iOS'
  else if (ua.includes('Linux')) versao_so = 'Linux'

  return {
    nome,
    modelo: /Mobi|Android/.test(ua) ? 'Mobile' : 'Desktop',
    versao_so,
    plataforma: 'Web',
  }
}

function resetarEstado() {
  // Nao resetar abaAtiva aqui: ela e controlada pelo pai via v-model e
  // pode vir pre-definida via URL (/config/:aba).
  subnivelMobile.value = null
  senhaAtual.value = ''
  senhaNova.value = ''
  confirmacaoSenha.value = ''
  erro.value = ''
  sucesso.value = ''
  erroPerfil.value = ''
  sucessoPerfil.value = ''
  erroAvatar.value = ''
  nomeUsuario.value = auth.user?.nome || ''
  emailUsuario.value = auth.user?.email || ''
  uploadProgresso.value = 0

  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
    avatarPreview.value = ''
  }
}

function fechar() {
  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
    avatarPreview.value = ''
  }
  emit('close')
}

async function carregarDispositivosMidia() {
  erroDispositivos.value = ''
  carregandoDispositivos.value = true

  try {
    if (!navigator.mediaDevices?.enumerateDevices) {
      dispositivosMidia.value = []
      erroDispositivos.value = 'Seu navegador nao suporta listagem de dispositivos de midia.'
      return
    }

    const lista = await navigator.mediaDevices.enumerateDevices()
    dispositivosMidia.value = lista
      .filter(item => item.label)
      .map((item, index) => ({
        id: item.deviceId || `dispositivo-${index + 1}`,
        label: item.label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, '').trim(),
        tipo: tipoDispositivoFormatado(item.kind),
        variante: item.deviceId === 'default' ? 'padrao' as const
          : item.deviceId === 'communications' ? 'comunicacao' as const
          : undefined,
      }))
  } catch (e) {
    dispositivosMidia.value = []
    erroDispositivos.value = e instanceof Error ? e.message : 'Nao foi possivel listar os dispositivos de midia.'
  } finally {
    carregandoDispositivos.value = false
  }
}

function tipoDispositivoFormatado(kind: MediaDeviceKind) {
  if (kind === 'audioinput') return 'Microfone'
  if (kind === 'audiooutput') return 'Saida de audio'
  if (kind === 'videoinput') return 'Camera'
  return 'Dispositivo'
}

function nomeTipoDispositivo(kind: MediaDeviceKind, index: number) {
  return `${tipoDispositivoFormatado(kind)} ${index}`
}

async function selecionarAvatar(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file || !auth.user) return

  erroAvatar.value = ''
  enviandoAvatar.value = true
  uploadProgresso.value = 0

  try {
    const redimensionada = await redimensionarImagem(file)
    avatarPreview.value = URL.createObjectURL(redimensionada)

    const anexo = await api.uploadAnexo(
      TipoConteudo.Imagem,
      'avatar.jpg',
      'jpg',
      redimensionada,
      (p) => { uploadProgresso.value = p }
    )

    await api.atualizarUsuario(auth.user.id, { avatar_anexo_id: anexo.id })

    const url = await api.getAnexoUrl(anexo.identificador)
    auth.atualizarAvatar(anexo.identificador, url)

    URL.revokeObjectURL(avatarPreview.value)
    avatarPreview.value = ''
    uploadProgresso.value = 100
  } catch (e) {
    erroAvatar.value = e instanceof Error ? e.message : 'Erro ao enviar avatar'
    if (avatarPreview.value) {
      URL.revokeObjectURL(avatarPreview.value)
      avatarPreview.value = ''
    }
  } finally {
    enviandoAvatar.value = false
  }
}

async function removerAvatar() {
  if (!auth.user) return
  erroAvatar.value = ''
  enviandoAvatar.value = true
  try {
    await api.atualizarUsuario(auth.user.id, { avatar_anexo_id: null })
    auth.removerAvatar()
  } catch (e) {
    erroAvatar.value = e instanceof Error ? e.message : 'Erro ao remover avatar'
  } finally {
    enviandoAvatar.value = false
  }
}

async function salvarPerfil() {
  erroPerfil.value = ''
  sucessoPerfil.value = ''

  if (!auth.user) {
    erroPerfil.value = 'Usuario nao autenticado.'
    return
  }

  if (!nomeUsuario.value || !emailUsuario.value) {
    erroPerfil.value = 'Preencha nome e email.'
    return
  }

  // Só vai o que a pessoa pode mudar: o servidor recusa o resto
  const alteracoes = {
    ...(auth.pode(CodigoPermissao.Nome) ? { nome: nomeUsuario.value } : {}),
    ...(auth.pode(CodigoPermissao.Email) ? { email: emailUsuario.value } : {}),
  }
  salvandoPerfil.value = true
  try {
    await api.atualizarUsuario(auth.user.id, alteracoes)
    auth.atualizarPerfil(alteracoes)
    sucessoPerfil.value = 'Dados atualizados com sucesso.'
  } catch (e) {
    erroPerfil.value = e instanceof Error ? e.message : 'Nao foi possivel salvar os dados do usuario.'
  } finally {
    salvandoPerfil.value = false
  }
}

async function salvarSenha() {
  erro.value = ''
  sucesso.value = ''

  if (!senhaAtual.value || !senhaNova.value || !confirmacaoSenha.value) {
    erro.value = 'Preencha todos os campos de senha.'
    return
  }

  if (senhaNova.value.length < 6) {
    erro.value = 'A nova senha deve ter pelo menos 6 caracteres.'
    return
  }

  if (senhaNova.value !== confirmacaoSenha.value) {
    erro.value = 'A confirmacao da senha nao confere.'
    return
  }

  salvando.value = true
  try {
    await api.alterarSenha(senhaAtual.value, senhaNova.value)
    sucesso.value = 'Senha alterada com sucesso.'
    senhaAtual.value = ''
    senhaNova.value = ''
    confirmacaoSenha.value = ''
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Nao foi possivel alterar a senha.'
  } finally {
    salvando.value = false
  }
}

</script>

<style scoped>
.settings-modal,
.settings-modal * {
  user-select: none;
  -webkit-user-select: none;
}

.settings-modal input,
.settings-modal textarea {
  user-select: text;
  -webkit-user-select: text;
}
</style>
