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
            <button class="text-sm text-slate-600 hover:text-slate-900" @click="sair">Sair</button>
          </div>

          <button class="w-full rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700" @click="abrirModalGrupo = true">
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

      <main class="flex flex-1 flex-col">
        <div v-if="chat.conversaAtiva" class="border-b border-slate-200 p-4">
          <div class="mx-auto w-full max-w-[1200px]">
            <div class="mb-2 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-800">
                {{ chat.conversaAtiva.descricao || chat.conversaAtiva.nome || `Conversa #${chat.conversaAtiva.id}` }}
              </h2>
              <span class="text-xs uppercase tracking-wide text-slate-500">{{ chat.conversaAtiva.tipo === 2 ? 'Grupo' : 'Chat' }}</span>
            </div>

            <div class="flex gap-2">
              <input
                v-model="buscaNoChat"
                type="text"
                class="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Pesquisar nesta conversa"
                @keyup.enter="pesquisarNoChat"
              />
              <button class="rounded bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800" @click="pesquisarNoChat">
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
                          class="mt-1 text-xs underline"
                          @click.prevent="abrirAnexo(conteudo.conteudo, conteudo.nome || 'video')"
                        >
                          Baixar video
                        </button>
                      </template>
                      <div v-else class="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-2 text-slate-800">
                        <div class="min-w-12 text-center">
                          <div class="text-2xl leading-none">{{ infoArquivo(conteudo).icone }}</div>
                          <div class="mt-1 max-w-28 truncate text-[11px]" :title="conteudo.nome || 'Arquivo'">
                            {{ conteudo.nome || 'Arquivo' }}
                          </div>
                        </div>
                        <button
                          class="ml-auto rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-800"
                          @click.prevent="abrirAnexo(conteudo.conteudo, conteudo.nome || 'Arquivo')"
                        >
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
              <button class="rounded bg-slate-200 px-3 py-2 text-sm hover:bg-slate-300" title="Anexar arquivo" @click="inputArquivo?.click()">
                Arquivo
              </button>

              <button class="rounded bg-slate-200 px-3 py-2 text-sm hover:bg-slate-300" title="Emoji" @click="mostrarEmoji = !mostrarEmoji">
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
                class="rounded px-3 py-2 text-sm font-medium text-white"
                :class="gravandoAudio ? 'bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-700'"
                @mousedown.prevent="iniciarAudio"
                @mouseup.prevent="pararAudio"
                @mouseleave.prevent="pararAudio"
                @touchstart.prevent="iniciarAudio"
                @touchend.prevent="pararAudio"
                @touchcancel.prevent="pararAudio"
              >
                {{ gravandoAudio ? 'Gravando...' : 'Segure p/ \u00E1udio' }}
              </button>

              <input
                v-model="textoMensagem"
                type="text"
                class="flex-1 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Digite sua mensagem"
                @keyup.enter="enviarTexto"
                @paste="aoColarNoChat"
              />

              <button class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" @click="enviarTexto">
                Enviar
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <div
      v-if="imagemTelaCheiaAberta"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/90 p-4"
      @click.self="fecharImagemTelaCheia"
    >
      <div class="relative" @click.stop>
        <img
          :src="imagemTelaCheiaUrl"
          :alt="imagemTelaCheiaNome"
          class="max-h-[92vh] max-w-[92vw] select-none object-contain transition-transform duration-150"
          :style="{ transform: `scale(${zoomImagemTelaCheia})` }"
          @wheel.prevent="zoomImagemPorRoda"
        />

        <div class="absolute right-2 top-2 flex items-center gap-2 rounded bg-black/55 px-2 py-1 text-white">
          <button class="rounded bg-white/20 px-2 py-1 text-sm hover:bg-white/30" @click="ajustarZoomImagem(-0.2)">-</button>
          <span class="min-w-12 text-center text-xs">{{ Math.round(zoomImagemTelaCheia * 100) }}%</span>
          <button class="rounded bg-white/20 px-2 py-1 text-sm hover:bg-white/30" @click="ajustarZoomImagem(0.2)">+</button>
          <button class="rounded bg-white/20 px-2 py-1 text-sm hover:bg-white/30" @click="fecharImagemTelaCheia">Fechar</button>
        </div>
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
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'
import type { ConteudoMensagem, Mensagem } from './types/api'
import { getAttachmentUrl } from './services/http'

const auth = useAuthStore()
const chat = useChatStore()

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

const emojis = [0x1F600,0x1F601,0x1F602,0x1F923,0x1F60A,0x1F60D,0x1F60E,0x1F622,0x1F621,0x1F44D,0x1F64F,0x2764].map((code) => String.fromCodePoint(code))

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
    await posicionarAberturaConversaAtiva()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao efetuar login'
  } finally {
    carregandoLogin.value = false
  }
}

function sair() {
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

function infoArquivo(conteudo: ConteudoMensagem): { icone: string; tipo: string } {
  const ext = normalizarExtensaoArquivo(conteudo)
  const iconePadrao = String.fromCodePoint(0x1F4C4)

  if (['pdf'].includes(ext)) {
    return { icone: String.fromCodePoint(0x1F4D5), tipo: 'PDF' }
  }
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) {
    return { icone: String.fromCodePoint(0x1F4DD), tipo: 'Documento' }
  }
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return { icone: String.fromCodePoint(0x1F4CA), tipo: 'Planilha' }
  }
  if (['ppt', 'pptx', 'odp'].includes(ext)) {
    return { icone: String.fromCodePoint(0x1F4C8), tipo: 'ApresentaÃƒÂ§ÃƒÂ£o' }
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { icone: String.fromCodePoint(0x1F5DC), tipo: 'Compactado' }
  }
  if (['txt', 'md', 'log', 'json', 'xml', 'yml', 'yaml'].includes(ext)) {
    return { icone: String.fromCodePoint(0x1F4C3), tipo: 'Texto' }
  }
  return { icone: iconePadrao, tipo: ext.toUpperCase() || 'Arquivo' }
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
