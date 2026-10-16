<template>
  <div class="flex h-full flex-col overflow-hidden bg-surface-base">
    <div class="shrink-0 border-b border-surface-300 px-4 py-3">
      <div class="mx-auto w-full max-w-[850px]">
        <h2 class="text-lg font-semibold text-surface-800">Atividades</h2>
      </div>
    </div>

    <div v-if="atividades.carregando && atividades.lista.length === 0" class="flex flex-1 items-center justify-center">
      <span class="text-sm text-surface-500">Carregando...</span>
    </div>

    <div v-else-if="atividades.lista.length === 0" class="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
      <span class="text-sm text-surface-500">Nenhuma atividade ainda.</span>
      <span class="text-xs text-surface-400">Reações, respostas, menções, pedidos de confirmação de leitura e chamadas perdidas aparecem aqui.</span>
    </div>

    <div v-else class="flex-1 overflow-y-auto" @scroll="aoRolar">
      <div class="mx-auto w-full max-w-[850px]">
        <template v-for="grupo in grupos" :key="grupo.rotulo">
          <div class="sticky top-0 z-10 bg-surface-100 px-4 py-1.5 text-xs font-medium text-surface-500">
            {{ grupo.rotulo }}
          </div>
          <!-- Pendente fica destacada até concluir; o botão ao lado conclui à mão -->
          <div
            v-for="atividade in grupo.itens"
            :key="atividade.id"
            class="group flex w-full items-start transition hover:bg-surface-100"
            :class="atividade.pendente ? 'bg-primary-50 dark:bg-primary-900/20' : ''"
          >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-start gap-3 py-2.5 pl-4 text-left"
            @click="abrir(atividade)"
          >
            <!-- Avatar de quem fez, com o tipo da atividade no canto -->
            <div class="relative shrink-0">
              <div class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-surface-300 text-sm font-semibold text-surface-700">
                <img v-if="atividade.autor_avatar_url" :src="atividade.autor_avatar_url" alt="" class="h-full w-full object-cover" />
                <span v-else>{{ inicialNome(atividade.autor_nome, '?') }}</span>
              </div>
              <span
                class="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface-base text-[10px]"
                :class="selo(atividade).classe"
              >{{ selo(atividade).texto }}</span>
            </div>

            <div class="min-w-0 flex-1">
              <p class="text-sm text-surface-800">
                <span class="font-semibold">{{ atividade.autor_nome }}</span>
                {{ descricao(atividade) }}
              </p>
              <p v-if="ondeFoi(atividade)" class="truncate text-xs text-surface-500">{{ ondeFoi(atividade) }}</p>
              <p v-if="previa(atividade)" class="mt-0.5 truncate text-xs italic text-surface-600">“{{ previa(atividade) }}”</p>
            </div>

            <div class="flex shrink-0 flex-col items-end gap-1">
              <span class="text-[11px] text-surface-500">{{ formatarHora(atividade.criado_em) }}</span>
              <span v-if="atividade.pendente" class="h-2 w-2 rounded-full bg-primary-500" title="Pendente"></span>
            </div>
          </button>
          <button
            v-if="atividade.pendente"
            type="button"
            class="mx-2 mt-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-surface-500 hover:bg-surface-200 hover:text-success-600"
            :title="atividade.tipo === TipoAtividade.Confirmacao ? 'Marcar como concluída (a leitura continua sem confirmar)' : 'Marcar como concluída'"
            aria-label="Marcar como concluída"
            @click="atividades.concluir(atividade.id)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
          </button>
          <span v-else class="mx-2 w-7 shrink-0"></span>
          </div>
        </template>

        <p v-if="atividades.carregando" class="py-3 text-center text-xs text-surface-500">Carregando...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useAtividadesStore } from '../stores/atividades'
import { TipoAtividade, TipoChamada, TipoConteudo, TipoConversa, type Atividade } from '../types/api'
import { formatarHora, inicialNome } from '../utils/formatters'

const emit = defineEmits<{
  'open-message': [conversaId: number, mensagemId: number]
  'open-conversa': [conversaId: number]
}>()

const atividades = useAtividadesStore()

onMounted(() => { void atividades.abrir() })
onUnmounted(() => atividades.fechar())

const grupos = computed(() => {
  const hoje = new Date()
  const ontem = new Date(hoje)
  ontem.setDate(ontem.getDate() - 1)
  const lista: { rotulo: string; itens: Atividade[] }[] = []
  for (const atividade of atividades.lista) {
    const dia = atividade.criado_em.toDateString()
    const rotulo = dia === hoje.toDateString()
      ? 'Hoje'
      : dia === ontem.toDateString()
        ? 'Ontem'
        : atividade.criado_em.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const ultimo = lista.at(-1)
    if (ultimo?.rotulo === rotulo) ultimo.itens.push(atividade)
    else lista.push({ rotulo, itens: [atividade] })
  }
  return lista
})

function descricao(atividade: Atividade) {
  switch (atividade.tipo) {
    case TipoAtividade.Reacao: return `reagiu ${atividade.emoji ?? ''} à sua mensagem`
    case TipoAtividade.Resposta: return 'respondeu sua mensagem'
    case TipoAtividade.Mencao: return 'mencionou você'
    case TipoAtividade.ChamadaPerdida:
      return atividade.chamada_tipo === TipoChamada.Video ? 'ligou (chamada de vídeo perdida)' : 'ligou (chamada perdida)'
    case TipoAtividade.Confirmacao: return 'pediu que você confirme a leitura'
  }
}

// Ícone pequeno no canto do avatar
function selo(atividade: Atividade) {
  switch (atividade.tipo) {
    case TipoAtividade.Reacao: return { texto: atividade.emoji ?? '❤️', classe: 'bg-surface-base' }
    case TipoAtividade.Resposta: return { texto: '↩', classe: 'bg-primary-500 text-white' }
    case TipoAtividade.Mencao: return { texto: '@', classe: 'bg-info-500 text-white font-bold' }
    case TipoAtividade.ChamadaPerdida: return { texto: '✆', classe: 'bg-danger-500 text-white' }
    case TipoAtividade.Confirmacao: return { texto: '✓', classe: 'bg-success-500 text-white font-bold' }
  }
}

// Só em grupo: na conversa direta o nome de quem fez já diz onde foi
function ondeFoi(atividade: Atividade) {
  return atividade.conversa_tipo === TipoConversa.Grupo && atividade.conversa_descricao
    ? `em ${atividade.conversa_descricao}`
    : ''
}

const NOMES_CONTEUDO: Partial<Record<number, string>> = {
  [TipoConteudo.Imagem]: 'Imagem',
  [TipoConteudo.Arquivo]: 'Arquivo',
  [TipoConteudo.Audio]: 'Áudio',
  [TipoConteudo.GravacaoAudio]: 'Áudio',
  [TipoConteudo.Figurinha]: 'Figurinha',
  [TipoConteudo.Enquete]: 'Votação',
}

function previa(atividade: Atividade) {
  if (atividade.tipo === TipoAtividade.ChamadaPerdida) return ''
  return atividade.texto || (atividade.conteudo_tipo ? NOMES_CONTEUDO[atividade.conteudo_tipo] ?? '' : '')
}

// A chamada perdida conclui ao abrir; as outras concluem sozinhas (confirmar,
// ver a reação, ler) ou à mão
function abrir(atividade: Atividade) {
  if (atividade.tipo === TipoAtividade.ChamadaPerdida) void atividades.concluir(atividade.id)
  if (!atividade.conversa_id) return
  if (atividade.mensagem_id) emit('open-message', atividade.conversa_id, atividade.mensagem_id)
  else emit('open-conversa', atividade.conversa_id)
}

// Perto do fim da lista, carrega as anteriores
function aoRolar(evento: Event) {
  const lista = evento.target as HTMLElement
  if (lista.scrollTop + lista.clientHeight >= lista.scrollHeight - 200) void atividades.carregarMais()
}
</script>
