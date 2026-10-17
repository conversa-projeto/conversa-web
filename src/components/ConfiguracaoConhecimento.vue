<template>
  <div class="space-y-4">
    <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
      Documentos que os bots consultam para responder (políticas, manuais, perguntas frequentes). Cada documento é quebrado em trechos
      e indexado com a IA; o bot recebe os trechos mais parecidos com a pergunta e diz de qual documento vieram.
      Ligue as bases em cada bot, em Bots. Formatos: {{ formatos }}.
    </section>

    <p v-if="!recursos.conhecimento" class="rounded-xl bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:bg-warning-900/30 dark:text-warning-300">
      A base de conhecimento está desligada: defina o servidor de IA e o modelo de embeddings em Sistema para enviar documentos.
    </p>
    <p v-if="erro" class="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>
    <p v-if="carregando" class="text-sm text-surface-500">Carregando...</p>

    <template v-else>
      <section class="overflow-hidden rounded-2xl border border-surface-200">
        <button
          v-for="base in bases"
          :key="base.id"
          type="button"
          class="flex w-full items-center gap-3 border-t border-surface-200 px-4 py-3 text-left first:border-t-0 hover:bg-surface-100"
          :class="base.id === selecionadaId ? 'bg-surface-100' : ''"
          :aria-pressed="base.id === selecionadaId"
          @click="selecionar(base.id)"
        >
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm text-surface-800">{{ base.nome }}</span>
            <span class="block truncate text-xs text-surface-500">{{ base.descricao || 'Sem descrição' }}</span>
          </span>
          <span class="shrink-0 text-xs text-surface-500">{{ base.documentos }} {{ base.documentos === 1 ? 'documento' : 'documentos' }} · {{ base.trechos }} trechos</span>
        </button>
        <p v-if="bases.length === 0" class="px-4 py-3 text-sm text-surface-500">Nenhuma base ainda.</p>
      </section>

      <form v-if="nova" class="space-y-3 rounded-2xl border border-surface-200 bg-surface-50 p-4" @submit.prevent="criarBase">
        <h4 class="text-sm font-semibold text-surface-800">Nova base</h4>
        <label class="block text-sm text-surface-700">
          Nome
          <input v-model="nova.nome" type="text" maxlength="100" :class="[CAMPO, 'w-full']" placeholder="Ex.: RH" />
        </label>
        <label class="block text-sm text-surface-700">
          Descrição
          <input v-model="nova.descricao" type="text" :class="[CAMPO, 'w-full']" placeholder="Ex.: Políticas de férias, benefícios e ponto" />
          <span class="text-xs text-surface-500">Ajuda a IA a saber quando consultar esta base.</span>
        </label>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-xl border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-600/10 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-400/10" @click="nova = null">Cancelar</button>
          <button type="submit" :disabled="salvando || !nova.nome.trim()" class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">Criar base</button>
        </div>
      </form>
      <div v-else class="flex justify-end">
        <button type="button" class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700" @click="nova = { nome: '', descricao: '' }">Nova base</button>
      </div>

      <section v-if="selecionada && edicao" class="space-y-4 rounded-2xl border border-surface-200 bg-surface-50 p-4">
        <form class="space-y-3" @submit.prevent="salvarBase">
          <div class="grid gap-3 md:grid-cols-2">
            <label class="block text-sm text-surface-700">
              Nome
              <input v-model="edicao.nome" type="text" maxlength="100" :class="[CAMPO, 'w-full']" />
            </label>
            <label class="block text-sm text-surface-700">
              Descrição
              <input v-model="edicao.descricao" type="text" :class="[CAMPO, 'w-full']" />
            </label>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" :disabled="salvando" class="mr-auto rounded-xl px-4 py-2 text-sm text-danger-600 hover:bg-danger-500/10 disabled:opacity-50 dark:text-danger-400" @click="excluirBase">Excluir base</button>
            <button
              type="submit"
              :disabled="salvando || !edicao.nome.trim() || (edicao.nome.trim() === selecionada.nome && edicao.descricao.trim() === selecionada.descricao)"
              class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >Salvar</button>
          </div>
        </form>

        <div>
          <div class="flex items-center justify-between gap-2">
            <h5 class="text-sm font-medium text-surface-800">Documentos</h5>
            <button
              type="button"
              :disabled="!recursos.conhecimento || enviando > 0"
              class="rounded-xl border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-200 disabled:opacity-50"
              @click="inputArquivos?.click()"
            >{{ enviando > 0 ? `Lendo ${enviando}...` : 'Enviar documentos' }}</button>
            <input ref="inputArquivos" type="file" multiple :accept="aceitos" class="hidden" aria-label="Documentos da base" @change="enviarDocumentos" />
          </div>
          <div class="mt-2 overflow-hidden rounded-xl border border-surface-200 bg-surface-base">
            <div v-for="documento in documentos" :key="documento.id" class="flex items-center gap-3 border-t border-surface-200 px-3 py-2 first:border-t-0">
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm text-surface-800">{{ documento.nome }}</span>
                <span class="block truncate text-xs" :class="documento.status === StatusDocumento.Erro ? 'text-danger-600 dark:text-danger-400' : 'text-surface-500'">
                  {{ documento.status === StatusDocumento.Erro ? documento.erro : `${documento.caracteres.toLocaleString('pt-BR')} caracteres · ${documento.trechos} trechos` }}
                </span>
              </span>
              <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" :class="ESTILO_STATUS[documento.status]">{{ NOME_STATUS[documento.status] }}</span>
              <button type="button" class="shrink-0 rounded-lg px-2 py-1 text-xs text-danger-600 hover:bg-danger-500/10 dark:text-danger-400" @click="excluirDocumento(documento)">Excluir</button>
            </div>
            <p v-if="documentos.length === 0" class="px-3 py-2 text-sm text-surface-500">Nenhum documento nesta base.</p>
          </div>
        </div>

        <form class="space-y-2" @submit.prevent="testarBusca">
          <h5 class="text-sm font-medium text-surface-800">Testar busca</h5>
          <p class="text-xs text-surface-500">Os trechos que o bot receberia para esta pergunta.</p>
          <div class="flex gap-2">
            <input v-model="pergunta" type="text" :class="[CAMPO, 'mt-0 min-w-0 flex-1']" placeholder="Ex.: Com quanta antecedência peço férias?" aria-label="Pergunta de teste" />
            <button type="submit" :disabled="buscando || !pergunta.trim() || !recursos.conhecimento" class="shrink-0 rounded-xl border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-600/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-400/10">
              {{ buscando ? 'Buscando...' : 'Buscar' }}
            </button>
          </div>
          <p v-if="achados && achados.length === 0" class="text-sm text-surface-500">Nada encontrado.</p>
          <div v-for="(trecho, indice) in achadosDestacados" :key="indice" class="rounded-xl border border-surface-200 bg-surface-base p-3">
            <p class="text-xs text-surface-500">{{ trecho.documento }} · semelhança {{ trecho.nota.toFixed(2) }}</p>
            <p class="mt-1 whitespace-pre-line text-sm text-surface-700"><template v-for="(parte, i) in trecho.partes" :key="i"><mark
              v-if="parte.destaque"
              class="rounded-sm bg-primary-100 px-0.5 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
            >{{ parte.texto }}</mark><template v-else>{{ parte.texto }}</template></template></p>
          </div>
        </form>
      </section>

      <section v-if="bases.length" class="rounded-2xl border border-surface-200 p-4">
        <h5 class="text-sm font-medium text-surface-800">Trocou o modelo de embeddings?</h5>
        <p class="mt-1 text-xs text-surface-500">Os trechos precisam ser indexados de novo com o modelo novo, em todas as bases.</p>
        <button
          type="button"
          :disabled="salvando || !recursos.conhecimento"
          class="mt-2 rounded-xl border border-surface-300 px-4 py-2 text-sm text-surface-700 hover:bg-surface-200 disabled:opacity-50"
          @click="reindexar"
        >Reindexar tudo</button>
      </section>
    </template>

    <DialogoConfirmacao :dialogo="dialogo.aberto.value" @responder="dialogo.responderDialogo" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as api from '../services/conversaApi'
import { useDialogo } from '../composables/useDialogo'
import { useRecursos } from '../composables/useRecursos'
import { StatusDocumento, type BaseConhecimento, type DocumentoConhecimento, type TrechoConhecimento } from '../types/api'
import { EXTENSOES_DOCUMENTO, textoDoDocumento } from '../utils/textoDocumento'
import { partesDestacadas } from '../utils/destacarTermos'
import DialogoConfirmacao from './DialogoConfirmacao.vue'

const CAMPO = 'mt-1 block rounded-xl border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
const NOME_STATUS: Record<StatusDocumento, string> = { [StatusDocumento.Processando]: 'Indexando', [StatusDocumento.Pronto]: 'Pronto', [StatusDocumento.Erro]: 'Erro' }
const ESTILO_STATUS: Record<StatusDocumento, string> = {
  [StatusDocumento.Processando]: 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300',
  [StatusDocumento.Pronto]: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
  [StatusDocumento.Erro]: 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300',
}
// Enquanto algum documento indexa, a lista é atualizada sozinha
const INTERVALO_ATUALIZAR_MS = 3000

const formatos = EXTENSOES_DOCUMENTO.map((e) => `.${e}`).join(', ')
const aceitos = EXTENSOES_DOCUMENTO.map((e) => `.${e}`).join(',')

const { recursos } = useRecursos()
const dialogo = useDialogo()
const bases = ref<BaseConhecimento[]>([])
const documentos = ref<DocumentoConhecimento[]>([])
const selecionadaId = ref<number | null>(null)
const carregando = ref(true)
const erro = ref('')
const salvando = ref(false)
const enviando = ref(0)
const nova = ref<{ nome: string; descricao: string } | null>(null)
const edicao = ref<{ nome: string; descricao: string } | null>(null)
const inputArquivos = ref<HTMLInputElement | null>(null)
const pergunta = ref('')
const buscando = ref(false)
const achados = ref<TrechoConhecimento[] | null>(null)
// A pergunta da busca feita: o destaque não muda enquanto se digita outra
const perguntaBuscada = ref('')
const achadosDestacados = computed(() => (achados.value ?? []).map((trecho) => ({ ...trecho, partes: partesDestacadas(trecho.texto, perguntaBuscada.value) })))
let relogio: number | undefined

const selecionada = computed(() => bases.value.find((b) => b.id === selecionadaId.value) ?? null)

onMounted(async () => {
  try {
    bases.value = await api.getBasesConhecimento()
    if (bases.value[0]) await selecionar(bases.value[0].id)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao carregar as bases'
  } finally {
    carregando.value = false
  }
})

onBeforeUnmount(() => window.clearTimeout(relogio))

async function atualizar() {
  window.clearTimeout(relogio)
  const id = selecionadaId.value
  if (!id) return
  const [lista, todas] = await Promise.all([api.getDocumentosConhecimento(id), api.getBasesConhecimento()])
  if (selecionadaId.value !== id) return
  documentos.value = lista
  bases.value = todas
  if (lista.some((d) => d.status === StatusDocumento.Processando)) {
    relogio = window.setTimeout(() => void atualizar().catch(() => {}), INTERVALO_ATUALIZAR_MS)
  }
}

async function selecionar(id: number) {
  selecionadaId.value = id
  const base = bases.value.find((b) => b.id === id)
  edicao.value = base ? { nome: base.nome, descricao: base.descricao } : null
  documentos.value = []
  achados.value = null
  try {
    await atualizar()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao carregar os documentos'
  }
}

async function criarBase() {
  if (!nova.value) return
  erro.value = ''
  salvando.value = true
  try {
    const base = await api.incluirBaseConhecimento(nova.value.nome.trim(), nova.value.descricao.trim())
    bases.value = [...bases.value, base].sort((a, b) => a.nome.localeCompare(b.nome))
    nova.value = null
    await selecionar(base.id)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao criar a base'
  } finally {
    salvando.value = false
  }
}

async function salvarBase() {
  const base = selecionada.value
  if (!base || !edicao.value) return
  erro.value = ''
  salvando.value = true
  try {
    const alterada = await api.alterarBaseConhecimento(base.id, edicao.value.nome.trim(), edicao.value.descricao.trim())
    bases.value = bases.value.map((b) => (b.id === alterada.id ? alterada : b))
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao salvar a base'
  } finally {
    salvando.value = false
  }
}

async function excluirBase() {
  const base = selecionada.value
  if (!base) return
  const confirmado = await dialogo.confirmar({
    titulo: `Excluir a base ${base.nome}?`,
    mensagem: 'Os documentos dela saem e os bots deixam de consultá-la. Não dá para desfazer.',
    textoConfirmar: 'Excluir',
    perigo: true,
  })
  if (!confirmado) return
  erro.value = ''
  salvando.value = true
  try {
    await api.excluirBaseConhecimento(base.id)
    bases.value = bases.value.filter((b) => b.id !== base.id)
    selecionadaId.value = null
    edicao.value = null
    documentos.value = []
    if (bases.value[0]) await selecionar(bases.value[0].id)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao excluir a base'
  } finally {
    salvando.value = false
  }
}

// O texto sai aqui no navegador; um arquivo que falha não impede os outros
async function enviarDocumentos(evento: Event) {
  const alvo = evento.target as HTMLInputElement
  const arquivos = [...(alvo.files ?? [])]
  alvo.value = ''
  const base = selecionadaId.value
  if (!base || !arquivos.length) return
  erro.value = ''
  enviando.value = arquivos.length
  const falhas: string[] = []
  for (const arquivo of arquivos) {
    try {
      const texto = await textoDoDocumento(arquivo)
      if (!texto.trim()) throw new Error('sem texto (PDF escaneado precisa de OCR)')
      await api.incluirDocumentoConhecimento(base, arquivo.name, texto)
    } catch (e) {
      falhas.push(`${arquivo.name}: ${e instanceof Error ? e.message : 'falhou'}`)
    } finally {
      enviando.value--
    }
  }
  if (falhas.length) erro.value = `Não foi possível enviar ${falhas.join('; ')}`
  await atualizar().catch(() => {})
}

async function excluirDocumento(documento: DocumentoConhecimento) {
  const confirmado = await dialogo.confirmar({
    titulo: `Excluir ${documento.nome}?`,
    mensagem: 'Os trechos dele saem da base e os bots deixam de usá-los.',
    textoConfirmar: 'Excluir',
    perigo: true,
  })
  if (!confirmado) return
  erro.value = ''
  try {
    await api.excluirDocumentoConhecimento(documento.id)
    documentos.value = documentos.value.filter((d) => d.id !== documento.id)
    await atualizar()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao excluir o documento'
  }
}

async function testarBusca() {
  const base = selecionadaId.value
  if (!base) return
  buscando.value = true
  erro.value = ''
  try {
    const buscada = pergunta.value.trim()
    achados.value = await api.buscarConhecimento([base], buscada)
    perguntaBuscada.value = buscada
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao buscar'
  } finally {
    buscando.value = false
  }
}

async function reindexar() {
  const confirmado = await dialogo.confirmar({
    titulo: 'Reindexar tudo?',
    mensagem: 'Todos os documentos de todas as bases são indexados de novo. Enquanto isso, os bots podem não achar os trechos.',
    textoConfirmar: 'Reindexar',
  })
  if (!confirmado) return
  erro.value = ''
  salvando.value = true
  try {
    await api.reindexarConhecimento()
    await atualizar()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao reindexar'
  } finally {
    salvando.value = false
  }
}
</script>
