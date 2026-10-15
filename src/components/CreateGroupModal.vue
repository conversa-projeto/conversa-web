<template>
  <div v-if="aberta" class="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-md rounded-xl border border-surface-300 bg-surface-base p-4 shadow-xl">
      <h3 class="mb-3 text-lg font-semibold text-surface-800">Criar grupo</h3>

      <!-- Imagem ou emoji do grupo (no lugar da primeira letra); um tira o outro -->
      <div class="mb-3 flex items-center gap-3" data-avatar-novo-grupo>
        <span class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-300 text-xl font-semibold text-surface-700">
          <img v-if="previaImagem" :src="previaImagem" alt="Imagem do grupo" class="h-full w-full object-cover" />
          <span v-else :class="emoji ? 'text-3xl' : ''">{{ emoji || inicialNome(nomeGrupo, 'G') }}</span>
        </span>
        <div class="flex flex-wrap gap-1">
          <button
            type="button"
            class="rounded px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-white/10"
            @click="seletorImagem?.click()"
          >
            Imagem
          </button>
          <input ref="seletorImagem" type="file" accept="image/*" class="hidden" aria-label="Imagem do grupo" @change="escolherImagem" />
          <button
            type="button"
            class="rounded px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-white/10"
            @click.stop="escolhendoEmoji = !escolhendoEmoji"
          >
            Emoji
          </button>
          <button
            v-if="imagem || emoji"
            type="button"
            class="rounded px-2 py-1 text-xs font-medium text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-white/10"
            @click="limparAvatar"
          >
            Remover
          </button>
        </div>
      </div>
      <EmojiPicker v-if="escolhendoEmoji" estatico class="mb-3 !w-full" @selecionar="escolherEmoji" @close="escolhendoEmoji = false" />

      <label class="mb-3 block text-sm text-surface-700">
        Nome do grupo
        <input
          v-model="nomeGrupo"
          type="text"
          class="mt-1 w-full rounded border border-surface-300 px-3 py-2 bg-surface-100 outline-none focus:border-primary-500 text-surface-800"
          placeholder="Ex: Projeto Alpha"
        />
      </label>

      <p class="mb-2 text-sm font-medium text-surface-700">Selecionar usu&aacute;rios</p>
      <input
        v-model="filtroContato"
        type="text"
        class="mb-2 w-full rounded border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-500"
        placeholder="Filtrar contatos"
      />
      <div class="max-h-52 overflow-auto rounded border border-surface-200">
        <label
          v-for="contato in contatosFiltrados"
          :key="`group-${contato.id}`"
          class="flex cursor-pointer items-center gap-2 border-b border-surface-100 px-3 py-2 text-sm hover:bg-surface-50"
        >
          <input v-model="membrosGrupo" type="checkbox" :value="contato.id" class="accent-primary-600 dark:accent-primary-500" />
          <div class="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-400 text-xs font-semibold text-surface-700">
            {{ inicialNome(contato.nome || '', 'C') }}
            <img v-if="avatarContato(contato)" :src="avatarContato(contato)" alt="Avatar" class="absolute inset-0 h-full w-full object-cover" @error="($event.target as HTMLImageElement).style.display = 'none'" />
          </div>
          <span>{{ contato.nome }}</span>
        </label>
        <p v-if="contatosFiltrados.length === 0" class="px-3 py-2 text-sm text-surface-500">Nenhum contato encontrado.</p>
      </div>

      <p v-if="erroGrupo" class="mt-2 rounded bg-danger-50 dark:bg-danger-900 px-2 py-1 text-sm text-danger-700 dark:text-danger-400">{{ erroGrupo }}</p>

      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded border border-surface-300 px-3 py-2 text-sm hover:bg-surface-100" @click="cancelar">Cancelar</button>
        <button class="rounded bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50" :disabled="criando" @click="confirmar">{{ criando ? 'Criando...' : 'Criar' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inicialNome } from '../utils/formatters'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useChatStore } from '../stores/chat'
import { useAuthStore } from '../stores/auth'
import { TipoConteudo, TipoConversa } from '../types/api'
import { uploadAnexo } from '../services/conversaApi'
import { redimensionarImagem } from '../utils/imageResize'
import EmojiPicker from './EmojiPicker.vue'

defineProps<{
  aberta: boolean
}>()

const emit = defineEmits<{
  'close': []
  'created': []
}>()

const chat = useChatStore()
const auth = useAuthStore()

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') cancelar()
}

const nomeGrupo = ref('')
const membrosGrupo = ref<number[]>([])
const filtroContato = ref('')
const erroGrupo = ref('')
const criando = ref(false)

// A imagem só é enviada ao criar; até lá, a prévia local
const seletorImagem = ref<HTMLInputElement>()
const imagem = ref<File | null>(null)
const previaImagem = ref('')
const emoji = ref('')
const escolhendoEmoji = ref(false)

function trocarImagem(arquivo: File | null) {
  if (previaImagem.value) URL.revokeObjectURL(previaImagem.value)
  imagem.value = arquivo
  previaImagem.value = arquivo ? URL.createObjectURL(arquivo) : ''
}

function escolherImagem(event: Event) {
  const campo = event.target as HTMLInputElement
  const arquivo = campo.files?.[0]
  campo.value = ''
  if (!arquivo) return
  emoji.value = ''
  escolhendoEmoji.value = false
  trocarImagem(arquivo)
}

function escolherEmoji(escolhido: string) {
  trocarImagem(null)
  emoji.value = escolhido
  escolhendoEmoji.value = false
}

function limparAvatar() {
  trocarImagem(null)
  emoji.value = ''
}

const contatosFiltrados = computed(() => {
  const termo = filtroContato.value.trim().toLowerCase()
  if (!termo) return chat.contatos
  return chat.contatos.filter((contato) => {
    return (
      contato.nome.toLowerCase().includes(termo) ||
      contato.login.toLowerCase().includes(termo) ||
      contato.email.toLowerCase().includes(termo)
    )
  })
})

// A lista de contatos nao traz foto: a sua vem do perfil e a dos outros, da
// conversa direta com eles. Sem foto (ou se ela falhar) fica a inicial.
function avatarContato(contato: { id: number; avatar_url?: string | null }) {
  if (contato.id === auth.user?.id) return auth.avatarUrl || auth.user.avatar_url || ''
  const conversaDireta = chat.conversas.find((conversa) =>
    conversa.tipo === TipoConversa.Direta && conversa.destinatario_id === contato.id
  )
  return contato.avatar_url || conversaDireta?.avatar_url || ''
}

function cancelar() {
  limparAvatar()
  escolhendoEmoji.value = false
  nomeGrupo.value = ''
  membrosGrupo.value = []
  filtroContato.value = ''
  erroGrupo.value = ''
  emit('close')
}

async function confirmar() {
  erroGrupo.value = ''

  if (!nomeGrupo.value.trim()) {
    erroGrupo.value = 'Informe o nome do grupo.'
    return
  }

  if (membrosGrupo.value.length === 0) {
    erroGrupo.value = 'Selecione ao menos um usu\u00E1rio.'
    return
  }

  criando.value = true
  try {
    const avatar = imagem.value
      ? { anexoId: (await uploadAnexo(TipoConteudo.Imagem, 'avatar.jpg', 'jpg', await redimensionarImagem(imagem.value))).id }
      : emoji.value ? { emoji: emoji.value } : null
    await chat.criarGrupo(nomeGrupo.value.trim(), membrosGrupo.value, avatar)
    limparAvatar()
    escolhendoEmoji.value = false
    nomeGrupo.value = ''
    membrosGrupo.value = []
    filtroContato.value = ''
    erroGrupo.value = ''
    emit('close')
    emit('created')
  } catch (e) {
    erroGrupo.value = e instanceof Error ? e.message : 'Erro ao criar grupo'
  } finally {
    criando.value = false
  }
}
</script>
