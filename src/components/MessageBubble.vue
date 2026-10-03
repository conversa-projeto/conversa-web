<template>
  <div
    :id="`msg-${mensagem.id}`"
    :class="[isOwn ? 'flex justify-end' : 'flex justify-start', mudouRemetente ? 'mt-[12px]' : 'mt-[3px]']"
  >
    <div class="flex max-w-[80%] flex-col" :class="isOwn ? 'items-end' : 'items-start'">
      <!-- Badge de mensagem agendada (so para o autor, enquanto visivel_em > agora) -->
      <div
        v-if="ehAgendadaFutura"
        class="mb-0.5 flex items-center gap-1 rounded-full bg-warning-100 px-2 py-0.5 text-[10px] font-medium text-warning-700 dark:bg-warning-900 dark:text-warning-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-3 w-3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <span>Agendada para {{ dataAgendadaFormatada }}</span>
      </div>

      <div
        ref="wrapperRef"
        class="group/bubble relative flex w-fit max-w-full items-end gap-1 before:pointer-events-auto before:absolute before:top-0 before:bottom-0 before:w-8"
        :class="[isOwn ? 'before:-left-8' : 'before:-right-8', ehAgendadaFutura ? 'opacity-70' : '']"
        @mouseleave="onMouseLeave"
        @contextmenu.prevent="onContextMenu"
      >
        <MensagemAcoes
          v-if="mensagem.id > 0 && !ehChamada && !ehExcluida"
          ref="acoesRef"
          :mensagem="mensagem"
          :is-own="isOwn"
          :is-group="isGroup"
          :menu-aberto="menuAcoesAberto"
          @reply="(msg) => emit('reply', msg)"
          @responder-privado="(msg) => emit('responder-privado', msg)"
          @forward="(msg) => emit('forward', msg)"
          @copiar="copiarMensagem"
          @reagir="(emoji) => emit('reagir', mensagem.id, emoji)"
          @excluir="(msg) => emit('excluir', msg)"
          @menu-toggle="(aberto) => menuAcoesAberto = aberto"
        />

        <component
          :is="componenteMap[tipoExibicao]"
          :mensagem="mensagem"
          :is-own="isOwn"
          :is-group="isGroup"
          :get-anexo-url="getAnexoUrl"
          @open-image="(id: string, nome: string) => emit('open-image', id, nome)"
          @image-loaded="emit('image-loaded')"
          @download="(id: string, nome: string) => emit('download', id, nome)"
          @go-to-message="(id: number, conversaId?: number) => emit('go-to-message', id, conversaId)"
        />

        <!-- Indicador de status de entrega (fora da bolha) -->
        <div
          v-if="isOwn && mensagem.id > 0 && !ehChamada"
          class="relative mb-1 shrink-0 cursor-default"
          @mouseenter="abrirStatus"
          @mouseleave="fecharStatus"
          @click.stop="mostrarStatus = !mostrarStatus"
        >
          <DetalheStatusMensagem v-if="mostrarStatus" :mensagem="mensagem" :is-group="isGroup" />
          <svg
            v-if="mensagem.enviando"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-3.5 w-3.5 text-surface-600"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <svg
            v-else-if="mensagem.visualizada"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.5"
            stroke="currentColor"
            class="h-3.5 w-3.5 text-primary-500"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M1.5 12.5l4 4L13 9" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 12.5l4 4L19 9" />
          </svg>
          <svg
            v-else-if="mensagem.recebida"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.5"
            stroke="currentColor"
            class="h-3.5 w-3.5 text-surface-600"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M1.5 12.5l4 4L13 9" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 12.5l4 4L19 9" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-3.5 w-3.5 text-surface-600"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <!-- Chamada nao tem status de entrega, mas ocupa o mesmo espaco para alinhar com as demais -->
        <div v-else-if="isOwn && mensagem.id > 0 && ehChamada" class="w-3.5 shrink-0" />
      </div>

      <!-- Reações existentes abaixo da bolha -->
      <div
        v-if="mensagem.reacoes && mensagem.reacoes.length > 0 && !ehExcluida"
        class="mt-0.5 flex flex-wrap gap-1 px-1"
        :class="isOwn ? 'mr-[19px] justify-end self-end pr-0' : 'justify-start self-start pl-0'"
      >
        <div
          v-for="reacao in mensagem.reacoes"
          :key="reacao.emoji"
          class="group/reacao relative"
        >
          <button
            class="reacao-btn flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition"
            :class="reacao.reagiu ? 'reacao-reagiu' : 'reacao-normal'"
            @click.stop="emit('reagir', mensagem.id, reacao.emoji)"
          >
            <span>{{ reacao.emoji }}</span>
            <span class="text-surface-500">{{ reacao.quantidade }}</span>
          </button>

          <!-- Tooltip com usuários que reagiram -->
          <div
            v-if="reacao.usuarios && reacao.usuarios.length > 0"
            class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-max -translate-x-1/2 rounded-lg border border-surface-300 bg-surface-100 px-2 py-1.5 shadow-lg group-hover/reacao:block dark:border-surface-500 dark:bg-surface-200"
          >
            <div class="flex flex-col gap-1">
              <div
                v-for="u in reacao.usuarios"
                :key="u.usuario_id"
                class="flex items-center gap-2"
              >
                <div class="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-[9px] font-semibold text-primary-700">
                  <img v-if="u.avatar_url" :src="u.avatar_url" alt="" class="h-full w-full object-cover" />
                  <span v-else>{{ inicialNome(u.nome) }}</span>
                </div>
                <span class="text-xs text-surface-700 dark:text-surface-600">{{ u.nome }}</span>
                <span class="text-[10px] text-surface-500">{{ formatarHoraReacao(u.reagido_em) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Mensagem } from '../types/api'
import { TipoConteudo } from '../types/api'
import { classificarMensagem, TipoExibicaoMensagem } from '../utils/classificarMensagem'
import { useAgora } from '../composables/useAgora'
import MensagemAcoes from './MensagemAcoes.vue'
import { emojiNome } from '../utils/emojiNomes'
import { inicialNome } from '../utils/formatters'
import BolhaImagem from './BolhaImagem.vue'
import BolhaCodigo from './BolhaCodigo.vue'
import BolhaReferencia from './BolhaReferencia.vue'
import BolhaTextoCurto from './BolhaTextoCurto.vue'
import BolhaEmoji from './BolhaEmoji.vue'
import BolhaFigurinha from './BolhaFigurinha.vue'
import BolhaPadrao from './BolhaPadrao.vue'
import BolhaChamada from './BolhaChamada.vue'
import BolhaExcluida from './BolhaExcluida.vue'
import DetalheStatusMensagem from './DetalheStatusMensagem.vue'
import { copiarImagem, type AlvoCopia } from '../utils/copiarImagem'

const props = defineProps<{
  mensagem: Mensagem
  isOwn: boolean
  isGroup: boolean
  mudouRemetente: boolean
  getAnexoUrl: (identificador: string) => string
}>()

const emit = defineEmits<{
  'open-image': [identificador: string, nome: string]
  'image-loaded': []
  'download': [identificador: string, nome: string]
  'reply': [mensagem: Mensagem]
  'responder-privado': [mensagem: Mensagem]
  'forward': [mensagem: Mensagem]
  'go-to-message': [mensagemId: number, conversaId?: number]
  'reagir': [mensagemId: number, emoji: string]
  'excluir': [mensagem: Mensagem]
}>()

const wrapperRef = ref<HTMLElement>()
const menuAcoesAberto = ref(false)

// Detalhe de quem recebeu e viu, ao parar o mouse sobre o ✓✓ (ou tocar nele)
const mostrarStatus = ref(false)
let esperaStatus: number | undefined

function abrirStatus() {
  esperaStatus = window.setTimeout(() => { mostrarStatus.value = true }, 300)
}

function fecharStatus() {
  window.clearTimeout(esperaStatus)
  mostrarStatus.value = false
}
const acoesRef = ref<InstanceType<typeof MensagemAcoes>>()

function onMouseLeave() {
  // Não fechar aqui — o menu fixed pode estar fora da bolha.
  // O fechamento é tratado pelo click externo e evento global.
}

function onContextMenu(event: MouseEvent) {
  if (props.mensagem.id > 0 && acoesRef.value) {
    acoesRef.value.abrirViaContextMenu(alvoDoClique(event.target as Element))
  }
}

// Imagem ou texto sob o clique direito, para copiar só aquele conteúdo
function alvoDoClique(elemento: Element): AlvoCopia {
  const imagem = elemento.closest('img')
  if (imagem?.src) return { tipo: 'imagem', url: imagem.src }
  if (elemento.closest('[data-conteudo-texto]')) return { tipo: 'texto' }
  return null
}

async function copiarMensagem(msg: Mensagem, alvo: AlvoCopia) {
  const imagemConteudo = msg.conteudos.find(c => Number(c.tipo) === TipoConteudo.Imagem)
  const urlImagem = alvo?.tipo === 'imagem'
    ? alvo.url
    : !alvo && imagemConteudo ? props.getAnexoUrl(imagemConteudo.conteudo) : ''
  if (urlImagem) {
    try {
      await copiarImagem(urlImagem)
    } catch { /* silently fail */ }
    return
  }

  const textos = msg.conteudos
    .filter(c => Number(c.tipo) === TipoConteudo.Texto)
    .map(c => c.conteudo)
    .join('\n')
  if (textos) {
    await navigator.clipboard.writeText(textos)
  }
}

function formatarHoraReacao(d: Date): string {
  const agora = new Date()
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === agora.toDateString()) return hora
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + hora
}

const tipoExibicao = computed(() => classificarMensagem(props.mensagem))

const componenteMap = {
  [TipoExibicaoMensagem.Excluida]: BolhaExcluida,
  [TipoExibicaoMensagem.Chamada]: BolhaChamada,
  [TipoExibicaoMensagem.Imagem]: BolhaImagem,
  [TipoExibicaoMensagem.Figurinha]: BolhaFigurinha,
  [TipoExibicaoMensagem.Codigo]: BolhaCodigo,
  [TipoExibicaoMensagem.ComReferencia]: BolhaReferencia,
  [TipoExibicaoMensagem.Emoji]: BolhaEmoji,
  [TipoExibicaoMensagem.TextoCurto]: BolhaTextoCurto,
  [TipoExibicaoMensagem.Padrao]: BolhaPadrao,
} as const

const ehChamada = computed(() => tipoExibicao.value === TipoExibicaoMensagem.Chamada)
// Excluída não tem ações nem reações: só o status e o conteúdo ao segurar
const ehExcluida = computed(() => tipoExibicao.value === TipoExibicaoMensagem.Excluida)

const agora = useAgora(() => props.mensagem.visivel_em)

/** True quando a mensagem esta agendada para um momento ainda no futuro. */
const ehAgendadaFutura = computed(() => {
  if (!props.mensagem.visivel_em) return false
  return new Date(props.mensagem.visivel_em).getTime() > agora.value
})

const dataAgendadaFormatada = computed(() => {
  if (!props.mensagem.visivel_em) return ''
  const d = new Date(props.mensagem.visivel_em)
  const hoje = new Date()
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === hoje.toDateString()) return `hoje ${hora}`
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  if (d.toDateString() === amanha.toDateString()) return `amanhã ${hora}`
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora}`
})
</script>
