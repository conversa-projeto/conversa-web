<template>
  <div v-if="aberta" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3">
    <div class="settings-modal relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:h-[760px] md:flex-row">
    <button
      class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      @click="fechar"
    >
      &times;
    </button>
      <aside class="border-b border-slate-200 bg-slate-50 md:w-72 md:shrink-0 md:border-b-0 md:border-r">
        <div class="border-b border-slate-200 p-5 pr-16">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Configuracoes</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-900">Preferencias da conta</h2>
          </div>
        </div>

        <div class="p-3">
          <button
            v-for="aba in abas"
            :key="aba.id"
            type="button"
            class="mb-2 w-full rounded-xl px-4 py-3 text-left transition"
            :class="abaAtiva === aba.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'"
            @click="abaAtiva = aba.id"
          >
            <span class="block text-sm font-semibold">{{ aba.titulo }}</span>
            <span class="mt-1 block truncate text-xs opacity-80">{{ aba.descricao }}</span>
          </button>
        </div>
      </aside>

      <section class="flex min-h-0 flex-1 flex-col">
        <div class="border-b border-slate-200 px-5 py-4">
          <h3 class="text-base font-semibold text-slate-900">{{ abaAtual?.titulo }}</h3>
          <p class="mt-1 text-sm text-slate-500">{{ abaAtual?.descricao }}</p>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div v-if="abaAtiva === 'usuario'" class="space-y-6">
            <section class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex flex-col gap-4 md:flex-row md:items-center">
                <div class="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-2xl font-semibold text-blue-700">
                  <img v-if="avatarPreview || avatarAtual" :src="avatarPreview || avatarAtual" alt="Avatar" class="h-full w-full object-cover" @error="($event.target as HTMLImageElement).style.display = 'none'" />
                  <span v-if="!avatarPreview && !avatarAtual">{{ inicialUsuario }}</span>
                  <div
                    v-if="uploadProgresso > 0 && uploadProgresso < 100"
                    class="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-bold text-white"
                  >
                    {{ uploadProgresso }}%
                  </div>
                </div>

                <div class="min-w-0 flex-1">
                  <h4 class="text-sm font-semibold text-slate-800">Foto de perfil</h4>
                  <p class="mt-1 text-sm text-slate-500">Atualize o avatar exibido no chat e nas conversas.</p>

                  <div class="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                      :disabled="enviandoAvatar"
                      @click="inputAvatar?.click()"
                    >
                      {{ enviandoAvatar ? 'Enviando...' : 'Alterar foto' }}
                    </button>
                    <button
                      v-if="avatarAtual"
                      type="button"
                      class="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
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
                  <p v-if="erroAvatar" class="mt-2 text-xs text-rose-600">{{ erroAvatar }}</p>
                </div>
              </div>
            </section>

            <form class="space-y-4" @submit.prevent="salvarPerfil">
              <section class="rounded-2xl border border-slate-200 p-4">
                <div class="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 class="text-sm font-semibold text-slate-800">Dados do usuario</h4>
                    <p class="mt-1 text-sm text-slate-500">Nome e email visiveis na sua conta.</p>
                  </div>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-sm text-slate-700">Nome</label>
                    <input v-model.trim="nomeUsuario" type="text" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm text-slate-700">Email</label>
                    <input v-model.trim="emailUsuario" type="email" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                  </div>
                </div>


                <p v-if="erroPerfil" class="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ erroPerfil }}</p>
                <p v-if="sucessoPerfil" class="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{{ sucessoPerfil }}</p>

                <div class="mt-4 flex justify-end">
                  <button type="submit" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60" :disabled="salvandoPerfil">
                    {{ salvandoPerfil ? 'Salvando...' : 'Salvar dados' }}
                  </button>
                </div>
              </section>
            </form>

            <form class="space-y-3 rounded-2xl border border-slate-200 p-4" @submit.prevent="salvarSenha">
              <div>
                <h4 class="text-sm font-semibold text-slate-800">Senha</h4>
                <p class="mt-1 text-sm text-slate-500">Altere sua senha de acesso.</p>
              </div>

              <div>
                <label class="mb-1 block text-sm text-slate-700">Senha atual</label>
                <input v-model="senhaAtual" type="password" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm text-slate-700">Nova senha</label>
                  <input v-model="senhaNova" type="password" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-slate-700">Confirmar nova senha</label>
                  <input v-model="confirmacaoSenha" type="password" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>

              <p v-if="erro" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ erro }}</p>
              <p v-if="sucesso" class="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{{ sucesso }}</p>

              <div class="flex justify-end">
                <button type="submit" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60" :disabled="salvando">
                  {{ salvando ? 'Salvando...' : 'Salvar senha' }}
                </button>
              </div>
            </form>
          </div>

          <div v-else-if="abaAtiva === 'dispositivos'" class="space-y-4">
            <section class="rounded-2xl border border-slate-200 p-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h4 class="text-sm font-semibold text-slate-800">Sessao atual</h4>
                  <p class="mt-1 text-sm text-slate-500">Informacoes do navegador autenticado neste momento.</p>
                </div>
                <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Ativo</span>
              </div>

              <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div class="rounded-xl bg-slate-50 p-3">
                  <p class="text-xs uppercase tracking-wide text-slate-500">Dispositivo</p>
                  <p class="mt-1 text-sm font-medium text-slate-800">{{ dispositivoAtual.nome }}</p>
                </div>
                <div class="rounded-xl bg-slate-50 p-3">
                  <p class="text-xs uppercase tracking-wide text-slate-500">Modelo</p>
                  <p class="mt-1 text-sm font-medium text-slate-800">{{ dispositivoAtual.modelo }}</p>
                </div>
                <div class="rounded-xl bg-slate-50 p-3">
                  <p class="text-xs uppercase tracking-wide text-slate-500">Sistema</p>
                  <p class="mt-1 text-sm font-medium text-slate-800">{{ dispositivoAtual.versao_so }}</p>
                </div>
                <div class="rounded-xl bg-slate-50 p-3">
                  <p class="text-xs uppercase tracking-wide text-slate-500">Plataforma</p>
                  <p class="mt-1 text-sm font-medium text-slate-800">{{ dispositivoAtual.plataforma }}</p>
                </div>
              </div>
            </section>

            <section class="rounded-2xl border border-slate-200 p-4">
              <div class="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 class="text-sm font-semibold text-slate-800">Dispositivos de midia</h4>
                  <p class="mt-1 text-sm text-slate-500">Lista local de microfones, cameras e saidas detectadas pelo navegador.</p>
                </div>
                <button type="button" class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60" :disabled="carregandoDispositivos" @click="carregarDispositivosMidia">
                  {{ carregandoDispositivos ? 'Atualizando...' : 'Atualizar lista' }}
                </button>
              </div>

              <p v-if="erroDispositivos" class="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{{ erroDispositivos }}</p>

              <div v-if="dispositivosMidia.length" class="space-y-3">
                <article v-for="dispositivo in dispositivosMidia" :key="dispositivo.id" class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-medium text-slate-800">{{ dispositivo.label }}</p>
                      <p class="mt-1 text-xs uppercase tracking-wide text-slate-500">{{ dispositivo.tipo }}</p>
                    </div>
                    <span class="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{{ dispositivo.id }}</span>
                  </div>
                </article>
              </div>

              <p v-else class="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                Nenhum dispositivo de midia foi identificado ainda. Se necessario, permita acesso a camera e microfone no navegador e atualize a lista.
              </p>
            </section>
          </div>

          <div v-else class="space-y-4">
            <section class="rounded-2xl border border-slate-200 p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h4 class="text-sm font-semibold text-slate-800">Configuracao de ramal</h4>
                  <p class="mt-1 text-sm text-slate-500">Os dados abaixo agora sao carregados do servidor e usados na preparacao da integracao com VueSIP.</p>
                </div>
                <span class="whitespace-nowrap rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Asterisk / VueSIP</span>
              </div>

              <form class="mt-4 grid gap-4 md:grid-cols-2" @submit.prevent="salvarVoip">
                <div>
                  <label class="mb-1 block text-sm text-slate-700">Ramal SIP</label>
                  <input v-model.trim="voip.sip_user" type="text" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="1001" />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-slate-700">Usuario de autenticacao</label>
                  <input v-model.trim="voip.auth_user" type="text" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="1001" />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-slate-700">Senha SIP</label>
                  <input v-model.trim="voip.sip_password" type="password" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Senha do ramal" />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-slate-700">Nome de exibicao</label>
                  <input v-model.trim="voip.display_name" type="text" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" :placeholder="auth.user?.nome || 'Seu nome'" />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-slate-700">Dominio SIP</label>
                  <input v-model.trim="voip.domain" type="text" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="pbx.exemplo.com" />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-slate-700">Servidor WebSocket</label>
                  <input v-model.trim="voip.ws_server" type="text" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="wss://pbx.exemplo.com:8089/ws" />
                </div>

                <label class="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 md:col-span-2">
                  <input v-model="voip.ativo" type="checkbox" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  Configuracao SIP ativa para este usuario
                </label>

                <p v-if="carregandoVoip" class="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 md:col-span-2">Carregando configuracao SIP...</p>
                <p v-if="erroVoip" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 md:col-span-2">{{ erroVoip }}</p>
                <p v-if="sucessoVoip" class="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 md:col-span-2">{{ sucessoVoip }}</p>

                <div class="flex justify-end md:col-span-2">
                  <button type="submit" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60" :disabled="salvandoVoip || carregandoVoip">
                    {{ salvandoVoip ? 'Salvando...' : (voip.id ? 'Salvar configuracao SIP' : 'Criar configuracao SIP') }}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import * as api from '../services/conversaApi'
import { useAuthStore } from '../stores/auth'
import type { SipConfig } from '../types/api'
import { TipoConteudo } from '../types/api'
import { redimensionarImagem } from '../utils/imageResize'
import { sipAtivo } from '../utils/sip'

type AbaId = 'usuario' | 'dispositivos' | 'voip'

type DispositivoMidiaItem = {
  id: string
  label: string
  tipo: string
}

type VoipForm = {
  id: number | null
  sip_user: string
  auth_user: string
  sip_password: string
  display_name: string
  domain: string
  ws_server: string
  ativo: boolean
}

const props = defineProps<{
  aberta: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const auth = useAuthStore()

const abas: Array<{ id: AbaId; titulo: string; descricao: string }> = [
  { id: 'usuario', titulo: 'Usuario', descricao: 'Nome, email, avatar e senha' },
  { id: 'dispositivos', titulo: 'Dispositivos', descricao: 'Sessao atual e perifericos locais' },
  { id: 'voip', titulo: 'Voip', descricao: 'Configuracao SIP do usuario' },
]

const abaAtiva = ref<AbaId>('usuario')

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

const voip = ref<VoipForm>(criarVoipPadrao())
const voipOriginal = ref<VoipForm>(criarVoipPadrao())
const carregandoVoip = ref(false)
const salvandoVoip = ref(false)
const erroVoip = ref('')
const sucessoVoip = ref('')

const avatarAtual = computed(() => auth.avatarUrl || '')
const inicialUsuario = computed(() => {
  const nome = auth.user?.nome?.trim() || auth.user?.login?.trim() || 'U'
  return nome.charAt(0).toUpperCase()
})
const abaAtual = computed(() => abas.find((aba) => aba.id === abaAtiva.value) || abas[0])
const dispositivoAtual = computed(() => detectarNavegador())

watch(() => props.aberta, (aberta) => {
  if (!aberta) return
  resetarEstado()
  void carregarAoAbrir()
})

function criarVoipPadrao(): VoipForm {
  return {
    id: null,
    sip_user: '',
    auth_user: '',
    sip_password: '',
    display_name: '',
    domain: '',
    ws_server: '',
    ativo: true,
  }
}

function mapearSipParaForm(data: SipConfig | null | undefined): VoipForm {
  if (!data) return criarVoipPadrao()

  return {
    id: Number(data.id) || null,
    sip_user: String(data.sip_user || ''),
    auth_user: String(data.auth_user || ''),
    sip_password: String(data.sip_password || ''),
    display_name: String(data.display_name || ''),
    domain: String(data.domain || ''),
    ws_server: String(data.ws_server || ''),
    ativo: sipAtivo(data.ativo),
  }
}

async function carregarAoAbrir() {
  await Promise.all([
    carregarDispositivosMidia(),
    carregarVoip(),
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
  abaAtiva.value = 'usuario'
  senhaAtual.value = ''
  senhaNova.value = ''
  confirmacaoSenha.value = ''
  erro.value = ''
  sucesso.value = ''
  erroPerfil.value = ''
  sucessoPerfil.value = ''
  erroAvatar.value = ''
  erroVoip.value = ''
  sucessoVoip.value = ''
  nomeUsuario.value = auth.user?.nome || ''
  emailUsuario.value = auth.user?.email || ''
  voip.value = criarVoipPadrao()
  voipOriginal.value = criarVoipPadrao()
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
    dispositivosMidia.value = lista.map((item, index) => ({
      id: item.deviceId || `dispositivo-${index + 1}`,
      label: item.label || nomeTipoDispositivo(item.kind, index + 1),
      tipo: tipoDispositivoFormatado(item.kind),
    }))
  } catch (e) {
    dispositivosMidia.value = []
    erroDispositivos.value = e instanceof Error ? e.message : 'Nao foi possivel listar os dispositivos de midia.'
  } finally {
    carregandoDispositivos.value = false
  }
}

async function carregarVoip() {
  erroVoip.value = ''
  sucessoVoip.value = ''
  carregandoVoip.value = true

  try {
    const data = await api.getSip()
    const form = mapearSipParaForm(data)
    voip.value = { ...form }
    voipOriginal.value = { ...form }
  } catch (e) {
    voip.value = criarVoipPadrao()
    voipOriginal.value = criarVoipPadrao()
    const mensagem = e instanceof Error ? e.message : 'Nao foi possivel carregar a configuracao SIP.'
    const semCadastro = /404|nao encontrado|nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o encontrado|not found/i.test(mensagem)
    if (!semCadastro) {
      erroVoip.value = mensagem
    }
  } finally {
    carregandoVoip.value = false
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

  salvandoPerfil.value = true
  try {
    await api.atualizarUsuario(auth.user.id, {
      nome: nomeUsuario.value,
      email: emailUsuario.value,
    })
    auth.atualizarPerfil({ nome: nomeUsuario.value, email: emailUsuario.value })
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

function montarPayloadCriacaoVoip() {
  return {
    sip_user: voip.value.sip_user,
    auth_user: voip.value.auth_user || null,
    sip_password: voip.value.sip_password,
    display_name: voip.value.display_name || null,
    domain: voip.value.domain,
    ws_server: voip.value.ws_server,
    ativo: voip.value.ativo,
  }
}

function montarAlteracoesVoip() {
  const alteracoes: Partial<SipConfig> = {}

  if (voip.value.sip_user !== voipOriginal.value.sip_user) alteracoes.sip_user = voip.value.sip_user
  if (voip.value.auth_user !== voipOriginal.value.auth_user) alteracoes.auth_user = voip.value.auth_user || null
  if (voip.value.sip_password !== voipOriginal.value.sip_password) alteracoes.sip_password = voip.value.sip_password
  if (voip.value.display_name !== voipOriginal.value.display_name) alteracoes.display_name = voip.value.display_name || null
  if (voip.value.domain !== voipOriginal.value.domain) alteracoes.domain = voip.value.domain
  if (voip.value.ws_server !== voipOriginal.value.ws_server) alteracoes.ws_server = voip.value.ws_server
  if (voip.value.ativo !== voipOriginal.value.ativo) alteracoes.ativo = voip.value.ativo

  return alteracoes
}

async function salvarVoip() {
  erroVoip.value = ''
  sucessoVoip.value = ''

  if (!voip.value.sip_user || !voip.value.sip_password || !voip.value.domain || !voip.value.ws_server) {
    erroVoip.value = 'Preencha ao menos ramal, senha SIP, dominio e servidor WebSocket.'
    return
  }

  salvandoVoip.value = true
  try {
    if (!voip.value.id) {
      const criado = await api.criarSip(montarPayloadCriacaoVoip())
      const form = mapearSipParaForm(criado)
      voip.value = { ...form }
      voipOriginal.value = { ...form }
      sucessoVoip.value = 'Configuracao SIP criada com sucesso.'
      return
    }

    const alteracoes = montarAlteracoesVoip()
    if (Object.keys(alteracoes).length === 0) {
      sucessoVoip.value = 'Nenhuma alteracao para salvar.'
      return
    }

    await api.atualizarSip({ id: voip.value.id, ...alteracoes })
    voipOriginal.value = { ...voip.value }
    sucessoVoip.value = 'Configuracao SIP atualizada com sucesso.'
  } catch (e) {
    erroVoip.value = e instanceof Error ? e.message : 'Nao foi possivel salvar a configuracao SIP.'
  } finally {
    salvandoVoip.value = false
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
