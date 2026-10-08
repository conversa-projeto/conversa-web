<template>
  <div
    class="w-72 max-w-full min-w-0 overflow-hidden rounded-xl px-3 pb-1 pt-2"
    :class="isOwn ? 'bg-primary-600 text-white' : 'bg-surface-300 dark:bg-surface-200 text-surface-800'"
  >
    <p v-if="isGroup && !isOwn" class="mb-0.5 text-xs font-semibold text-surface-500">{{ mensagem.remetente }}</p>

    <p v-if="!enquete && !erro" class="py-2 text-xs opacity-70">Carregando votação...</p>
    <p v-else-if="!enquete" class="py-2 text-xs opacity-70">{{ erro }}</p>

    <template v-else>
      <p class="text-sm font-semibold">📊 {{ enquete.pergunta }}</p>
      <p v-if="encerrada" class="mb-2 text-[11px] font-semibold opacity-80">🔒 Votação encerrada{{ momentoEncerramento ? ` ${momentoEncerramento}` : '' }}</p>
      <p v-else class="mb-2 text-[11px] opacity-70">
        {{ enquete.multipla ? 'Escolha uma ou mais opções' : 'Escolha uma opção' }}<template v-if="enquete.encerra_em"> · encerra {{ formatarPrazo(new Date(enquete.encerra_em)) }}</template>
      </p>

      <button
        v-for="opcao in enquete.opcoes"
        :key="opcao.id"
        type="button"
        class="mb-1.5 block w-full rounded-lg px-2 py-1.5 text-left transition"
        :class="encerrada ? 'cursor-default' : ['disabled:cursor-wait', isOwn ? 'hover:bg-white/10' : 'hover:bg-surface-400/30']"
        :disabled="votando || encerrada"
        :title="opcao.votantes.map((v) => v.nome).join(', ') || 'Ninguém votou ainda'"
        @click="alternar(opcao.id)"
      >
        <span class="flex items-center gap-2 text-sm">
          <!-- Círculo na escolha única, quadrado na múltipla -->
          <span
            class="flex h-4 w-4 shrink-0 items-center justify-center border-2"
            :class="[
              enquete.multipla ? 'rounded' : 'rounded-full',
              isOwn ? 'border-white' : 'border-primary-600',
              marcada(opcao.id) ? (isOwn ? 'bg-white' : 'bg-primary-600') : '',
            ]"
          >
            <svg v-if="marcada(opcao.id)" viewBox="0 0 20 20" fill="currentColor" class="h-3 w-3" :class="isOwn ? 'text-primary-600' : 'text-white'"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg>
          </span>
          <span class="min-w-0 flex-1 break-words" :class="{ 'font-semibold': vencedora(opcao.votantes.length) }">
            <template v-if="vencedora(opcao.votantes.length)">🏆 </template>{{ opcao.texto }}
          </span>
          <span class="shrink-0 text-xs font-semibold">{{ opcao.votantes.length }}</span>
        </span>
        <span class="mt-1 block h-1.5 overflow-hidden rounded-full" :class="isOwn ? 'bg-white/25' : 'bg-surface-400/40'">
          <span
            class="block h-full rounded-full transition-all duration-300"
            :class="isOwn ? 'bg-white' : 'bg-primary-500'"
            :style="{ width: `${porcentagem(opcao.votantes.length)}%` }"
          ></span>
        </span>
        <span v-if="opcao.votantes.length" class="mt-0.5 block truncate text-[10px] opacity-70">
          {{ opcao.votantes.map((v) => v.nome).join(', ') }}
        </span>
      </button>

      <p v-if="erro" class="text-[11px] text-danger-300">{{ erro }}</p>
      <p class="text-[11px] opacity-70">{{ enquete.total_votantes === 1 ? '1 pessoa votou' : `${enquete.total_votantes} pessoas votaram` }}</p>

      <!-- Data final: quem criou define, adia ou tira -->
      <div v-if="editandoPrazo" class="mt-2 rounded-lg bg-surface-base p-2 text-surface-800">
        <p class="mb-1 text-[11px] font-medium text-surface-600">Data final</p>
        <CampoDataHora v-model="novoPrazo" />
        <p v-if="erroNovoPrazo" class="mt-1 text-[11px] text-danger-600">{{ erroNovoPrazo }}</p>
        <div class="mt-2 flex flex-wrap justify-end gap-1">
          <button v-if="enquete.encerra_em" type="button" class="rounded px-2 py-1 text-xs text-danger-600 hover:bg-surface-200" :disabled="salvando" @click="salvarPrazo(null)">Tirar data</button>
          <button type="button" class="rounded px-2 py-1 text-xs text-surface-600 hover:bg-surface-200" @click="editandoPrazo = false">Cancelar</button>
          <button type="button" class="rounded bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50" :disabled="!!erroNovoPrazo || salvando" @click="salvarPrazo(novoPrazo)">Salvar</button>
        </div>
      </div>
      <div v-else-if="!encerrada && (enquete.pode_alterar_prazo || enquete.pode_encerrar)" class="mt-1.5 flex flex-wrap gap-1 border-t pt-1.5" :class="isOwn ? 'border-white/20' : 'border-surface-400/40'">
        <button
          v-if="enquete.pode_alterar_prazo"
          type="button"
          class="rounded px-2 py-0.5 text-[11px] font-medium"
          :class="isOwn ? 'hover:bg-white/10' : 'text-primary-600 hover:bg-surface-400/30'"
          @click="abrirPrazo"
        >{{ enquete.encerra_em ? 'Alterar data final' : 'Definir data final' }}</button>
        <button
          v-if="enquete.pode_encerrar"
          type="button"
          class="rounded px-2 py-0.5 text-[11px] font-medium"
          :class="isOwn ? 'hover:bg-white/10' : 'text-danger-600 hover:bg-surface-400/30'"
          :disabled="salvando"
          @click="encerrar"
        >Encerrar votação</button>
      </div>
    </template>

    <MensagemStatus :mensagem="mensagem" :is-own="isOwn" variante="padrao" />
    <DialogoConfirmacao :dialogo="dialogo.aberto.value" @responder="dialogo.responderDialogo" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Mensagem } from '../types/api'
import { useEnquetesStore } from '../stores/enquetes'
import { useAgora } from '../composables/useAgora'
import { useDialogo } from '../composables/useDialogo'
import { erroPrazo, formatarPrazo } from '../utils/prazoEnquete'
import MensagemStatus from './MensagemStatus.vue'
import CampoDataHora from './CampoDataHora.vue'
import DialogoConfirmacao from './DialogoConfirmacao.vue'

const props = defineProps<{
  mensagem: Mensagem
  isOwn: boolean
  isGroup: boolean
  getAnexoUrl: (identificador: string) => string
}>()

const enquetes = useEnquetesStore()
const votando = ref(false)
const erro = ref('')

const id = computed(() => Number(props.mensagem.conteudos[0]?.conteudo))
const enquete = computed(() => enquetes.porId[id.value])

const marcada = (opcao: number) => !!enquete.value?.meus_votos.includes(opcao)

// Encerrada pelo servidor, ou o prazo passou com a bolha aberta (o agora é
// atualizado bem na hora da data final)
const agora = useAgora(() => enquete.value?.encerra_em)
const encerrada = computed(() => {
  const dados = enquete.value
  if (!dados) return false
  return dados.encerrada || (!!dados.encerra_em && new Date(dados.encerra_em).getTime() <= agora.value)
})
const momentoEncerramento = computed(() => {
  const quando = enquete.value?.encerrada_em ?? enquete.value?.encerra_em
  return quando ? formatarPrazo(new Date(quando)) : ''
})

// Encerrada: destaca a(s) mais votada(s)
const maisVotos = computed(() => Math.max(0, ...(enquete.value?.opcoes.map((o) => o.votantes.length) ?? [])))
const vencedora = (votos: number) => encerrada.value && votos > 0 && votos === maisVotos.value

const dialogo = useDialogo()
const salvando = ref(false)
const editandoPrazo = ref(false)
const novoPrazo = ref<Date | null>(null)
const erroNovoPrazo = computed(() => erroPrazo(novoPrazo.value))

function abrirPrazo() {
  const atual = enquete.value?.encerra_em
  if (atual) {
    novoPrazo.value = new Date(atual)
  } else {
    const sugestao = new Date()
    sugestao.setDate(sugestao.getDate() + 1)
    sugestao.setHours(sugestao.getHours() + 1, 0, 0, 0)
    novoPrazo.value = sugestao
  }
  erro.value = ''
  editandoPrazo.value = true
}

async function salvarPrazo(prazo: Date | null) {
  salvando.value = true
  erro.value = ''
  try {
    await enquetes.alterarPrazo(id.value, prazo)
    editandoPrazo.value = false
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível mudar a data final'
  } finally {
    salvando.value = false
  }
}

async function encerrar() {
  const confirmado = await dialogo.confirmar({
    titulo: 'Encerrar votação',
    mensagem: 'Depois de encerrada, ninguém vota mais e o resultado fica como está.',
    textoConfirmar: 'Encerrar',
    perigo: true,
  })
  if (!confirmado) return
  salvando.value = true
  erro.value = ''
  try {
    await enquetes.encerrar(id.value)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível encerrar a votação'
  } finally {
    salvando.value = false
  }
}

// Sobre quem votou, como no WhatsApp: na múltipla, as barras somam mais de 100%
function porcentagem(votos: number) {
  const total = enquete.value?.total_votantes ?? 0
  return total ? Math.round((votos / total) * 100) : 0
}

// Escolha única: clicar em outra troca, clicar na mesma tira. Múltipla: marca e desmarca.
async function alternar(opcao: number) {
  if (!enquete.value || votando.value || encerrada.value) return
  const atuais = enquete.value.meus_votos
  const novos = marcada(opcao)
    ? atuais.filter((o) => o !== opcao)
    : enquete.value.multipla ? [...atuais, opcao] : [opcao]
  votando.value = true
  erro.value = ''
  try {
    await enquetes.votar(id.value, novos)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível votar'
  } finally {
    votando.value = false
  }
}

onMounted(() => {
  enquetes.carregar(id.value).catch((e) => {
    erro.value = e instanceof Error ? e.message : 'Não foi possível carregar a votação'
  })
})
</script>
