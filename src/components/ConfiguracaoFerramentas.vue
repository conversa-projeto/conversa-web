<template>
  <div class="space-y-4">
    <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
      APIs que os bots podem chamar para buscar informação de fora do chat (uma base de conhecimento, um sistema da empresa).
      A IA decide quando usar pela descrição. Ligue cada ferramenta nos bots que devem usá-la, em Bots.
      Os valores dos cabeçalhos (tokens) ficam só no servidor: nunca voltam para esta tela nem vão para a IA.
    </section>

    <p v-if="erro" class="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>
    <p v-if="carregando" class="text-sm text-surface-500">Carregando...</p>

    <template v-else>
      <form v-if="form" class="space-y-3 rounded-2xl border border-surface-200 bg-surface-50 p-4" @submit.prevent="salvar">
        <h4 class="text-sm font-semibold text-surface-800">{{ form.id ? `Editar ${form.nome}` : 'Nova ferramenta' }}</h4>

        <label class="block text-sm text-surface-700">
          Nome
          <input v-model="form.nome" type="text" maxlength="60" :class="[CAMPO, 'w-full font-mono']" placeholder="consultar_conhecimento" autocomplete="off" />
          <span class="text-xs text-surface-500">Como a IA chama a ferramenta: letras minúsculas, números e _.</span>
        </label>
        <label class="block text-sm text-surface-700">
          Descrição
          <textarea
            v-model="form.descricao"
            rows="3"
            :class="[CAMPO, 'w-full']"
            placeholder="Ex.: Busca na base de conhecimento da empresa trechos que respondem à pergunta. Use para dúvidas sobre produtos, prazos e políticas."
          ></textarea>
          <span class="text-xs text-surface-500">É assim que a IA sabe quando usar: diga o que ela faz e para que serve.</span>
        </label>

        <div class="flex gap-2">
          <label class="block text-sm text-surface-700">
            Método
            <select v-model="form.metodo" :class="CAMPO">
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </label>
          <label class="block min-w-0 flex-1 text-sm text-surface-700">
            Endereço
            <input v-model="form.url" type="text" :class="[CAMPO, 'w-full font-mono']" placeholder="https://base.empresa/colecoes/{colecao}/buscar" autocomplete="off" />
          </label>
        </div>
        <p class="-mt-2 text-xs text-surface-500">
          <code>{parametro}</code> no endereço vira o valor; os outros parâmetros vão na consulta (GET) ou no corpo JSON (POST).
        </p>

        <fieldset>
          <legend class="text-sm font-medium text-surface-800">Cabeçalhos</legend>
          <div v-for="(cabecalho, indice) in form.cabecalhos" :key="indice" class="mt-2 flex gap-2">
            <input v-model="cabecalho.nome" type="text" :class="[CAMPO, 'mt-0 w-40 font-mono']" placeholder="Authorization" aria-label="Nome do cabeçalho" autocomplete="off" />
            <input
              v-model="cabecalho.valor"
              type="password"
              :class="[CAMPO, 'mt-0 min-w-0 flex-1 font-mono']"
              :placeholder="cabecalho.salvo ? 'Salvo: deixe vazio para manter' : 'Bearer ...'"
              aria-label="Valor do cabeçalho"
              autocomplete="new-password"
            />
            <button type="button" class="shrink-0 rounded-lg px-2 text-sm text-danger-600 hover:bg-danger-500/10 dark:text-danger-400" @click="form.cabecalhos.splice(indice, 1)">Remover</button>
          </div>
          <button type="button" class="mt-2 text-sm text-primary-600 hover:underline dark:text-primary-400" @click="form.cabecalhos.push({ nome: '', valor: '', salvo: false })">+ Cabeçalho</button>
        </fieldset>

        <fieldset>
          <legend class="text-sm font-medium text-surface-800">Parâmetros</legend>
          <div v-for="(parametro, indice) in form.parametros" :key="indice" class="mt-2 flex flex-wrap items-center gap-2">
            <input v-model="parametro.nome" type="text" :class="[CAMPO, 'mt-0 w-40 font-mono']" placeholder="pergunta" aria-label="Nome do parâmetro" autocomplete="off" />
            <select v-model="parametro.tipo" :class="[CAMPO, 'mt-0']" aria-label="Tipo do parâmetro">
              <option value="string">texto</option>
              <option value="number">número</option>
              <option value="boolean">sim/não</option>
            </select>
            <input v-model="parametro.descricao" type="text" :class="[CAMPO, 'mt-0 min-w-0 flex-1']" placeholder="O que a IA deve mandar" aria-label="Descrição do parâmetro" />
            <label class="flex items-center gap-1 text-xs text-surface-700">
              <input v-model="parametro.obrigatorio" type="checkbox" class="h-4 w-4 accent-primary-600 dark:accent-primary-500" />
              obrigatório
            </label>
            <button type="button" class="shrink-0 rounded-lg px-2 text-sm text-danger-600 hover:bg-danger-500/10 dark:text-danger-400" @click="form.parametros.splice(indice, 1)">Remover</button>
          </div>
          <button type="button" class="mt-2 text-sm text-primary-600 hover:underline dark:text-primary-400" @click="form.parametros.push({ nome: '', tipo: 'string', descricao: '', obrigatorio: true })">+ Parâmetro</button>
        </fieldset>

        <label class="flex cursor-pointer items-center gap-3 text-sm text-surface-800">
          <input v-model="form.ativo" type="checkbox" class="h-4 w-4 accent-primary-600 dark:accent-primary-500" />
          Ligada (desligada, nenhum bot a usa)
        </label>

        <div class="flex justify-end gap-2">
          <button
            v-if="form.id"
            type="button"
            :disabled="salvando"
            class="mr-auto rounded-xl px-4 py-2 text-sm text-danger-600 hover:bg-danger-500/10 disabled:opacity-50 dark:text-danger-400"
            @click="excluir"
          >Excluir</button>
          <button type="button" class="rounded-xl px-4 py-2 text-sm text-surface-700 hover:bg-surface-200" @click="fechar">Cancelar</button>
          <button
            type="submit"
            :disabled="salvando || !form.nome.trim() || !form.descricao.trim() || !form.url.trim()"
            class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >{{ salvando ? 'Salvando...' : form.id ? 'Salvar' : 'Criar' }}</button>
        </div>

        <section v-if="form.id && salva" class="space-y-2 border-t border-surface-200 pt-3">
          <h5 class="text-sm font-medium text-surface-800">Testar</h5>
          <p class="text-xs text-surface-500">Chama a API como o bot chamaria, com o que está salvo.</p>
          <label v-for="parametro in salva.parametros" :key="parametro.nome" class="block text-sm text-surface-700">
            {{ parametro.nome }}<span v-if="parametro.obrigatorio" class="text-danger-600">*</span>
            <input v-model="exemplo[parametro.nome]" type="text" :class="[CAMPO, 'w-full']" :placeholder="parametro.descricao" />
          </label>
          <button
            type="button"
            :disabled="testando"
            class="rounded-xl border border-surface-300 px-4 py-2 text-sm text-surface-700 hover:bg-surface-200 disabled:opacity-50"
            @click="testar"
          >{{ testando ? 'Chamando...' : 'Testar' }}</button>
          <div v-if="teste" class="rounded-xl border p-3 text-sm" :class="teste.ok ? 'border-success-300 bg-success-50 dark:bg-success-900/30' : 'border-danger-300 bg-danger-50 dark:bg-danger-900/30'">
            <p class="font-medium" :class="teste.ok ? 'text-success-700 dark:text-success-300' : 'text-danger-700 dark:text-danger-300'">
              {{ teste.erro || `Respondeu ${teste.status}` }} · {{ teste.milissegundos }} ms
            </p>
            <pre v-if="teste.resposta" class="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs text-surface-700">{{ teste.resposta }}</pre>
          </div>
        </section>
      </form>

      <div v-else class="flex justify-end">
        <button type="button" class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700" @click="nova">Nova ferramenta</button>
      </div>

      <section class="overflow-hidden rounded-2xl border border-surface-200">
        <div v-for="ferramenta in ferramentas" :key="ferramenta.id" class="flex items-center gap-3 border-t border-surface-200 px-4 py-3 first:border-t-0">
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-2">
              <span class="truncate font-mono text-sm text-surface-800">{{ ferramenta.nome }}</span>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                :class="ferramenta.ativo ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300' : 'bg-surface-200 text-surface-600'"
              >{{ ferramenta.ativo ? 'Ligada' : 'Desligada' }}</span>
            </span>
            <span class="block truncate text-xs text-surface-500">{{ ferramenta.metodo }} {{ ferramenta.url }}</span>
          </span>
          <button type="button" class="shrink-0 rounded-lg px-3 py-1.5 text-sm text-primary-600 hover:bg-surface-200 dark:text-primary-400" @click="editar(ferramenta)">Editar</button>
        </div>
        <p v-if="ferramentas.length === 0" class="px-4 py-3 text-sm text-surface-500">Nenhuma ferramenta ainda.</p>
      </section>
    </template>

    <DialogoConfirmacao :dialogo="dialogo.aberto.value" @responder="dialogo.responderDialogo" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import * as api from '../services/conversaApi'
import { useDialogo } from '../composables/useDialogo'
import type { FerramentaExterna, ParametroFerramenta, TesteFerramenta } from '../types/api'
import DialogoConfirmacao from './DialogoConfirmacao.vue'

const CAMPO = 'mt-1 block rounded-xl border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100'

interface Formulario {
  id: number | null
  nome: string
  descricao: string
  metodo: 'GET' | 'POST'
  url: string
  // salvo: o valor está no servidor (vazio mantém)
  cabecalhos: { nome: string; valor: string; salvo: boolean }[]
  parametros: ParametroFerramenta[]
  ativo: boolean
}

const dialogo = useDialogo()
const ferramentas = ref<FerramentaExterna[]>([])
const carregando = ref(true)
const erro = ref('')
const salvando = ref(false)
const form = ref<Formulario | null>(null)
const exemplo = ref<Record<string, string>>({})
const testando = ref(false)
const teste = ref<TesteFerramenta | null>(null)

// O teste usa o que está salvo
const salva = computed(() => (form.value?.id ? ferramentas.value.find((f) => f.id === form.value!.id) ?? null : null))

onMounted(async () => {
  try {
    ferramentas.value = await api.getFerramentas()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao carregar as ferramentas'
  } finally {
    carregando.value = false
  }
})

function nova() {
  erro.value = ''
  teste.value = null
  form.value = {
    id: null,
    nome: '',
    descricao: '',
    metodo: 'GET',
    url: '',
    cabecalhos: [],
    parametros: [{ nome: 'pergunta', tipo: 'string', descricao: '', obrigatorio: true }],
    ativo: true,
  }
}

function editar(ferramenta: FerramentaExterna) {
  erro.value = ''
  teste.value = null
  exemplo.value = {}
  form.value = {
    id: ferramenta.id,
    nome: ferramenta.nome,
    descricao: ferramenta.descricao,
    metodo: ferramenta.metodo,
    url: ferramenta.url,
    cabecalhos: ferramenta.cabecalhos.map((nome) => ({ nome, valor: '', salvo: true })),
    parametros: ferramenta.parametros.map((p) => ({ ...p })),
    ativo: ferramenta.ativo,
  }
}

function fechar() {
  form.value = null
  teste.value = null
}

function trocar(ferramenta: FerramentaExterna) {
  const indice = ferramentas.value.findIndex((f) => f.id === ferramenta.id)
  if (indice >= 0) ferramentas.value.splice(indice, 1, ferramenta)
  else ferramentas.value = [...ferramentas.value, ferramenta].sort((a, b) => a.nome.localeCompare(b.nome))
}

async function salvar() {
  const atual = form.value
  if (!atual) return
  erro.value = ''
  salvando.value = true
  try {
    const campos = {
      nome: atual.nome.trim(),
      descricao: atual.descricao.trim(),
      metodo: atual.metodo,
      url: atual.url.trim(),
      cabecalhos: atual.cabecalhos.filter((c) => c.nome.trim()).map((c) => ({ nome: c.nome.trim(), valor: c.valor || null })),
      parametros: atual.parametros.filter((p) => p.nome.trim()),
      ativo: atual.ativo,
    }
    const salvaAgora = atual.id ? await api.alterarFerramenta(atual.id, campos) : await api.incluirFerramenta(campos)
    trocar(salvaAgora)
    // Continua aberta, já salva, para testar
    editar(salvaAgora)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao salvar a ferramenta'
  } finally {
    salvando.value = false
  }
}

async function excluir() {
  const atual = form.value
  if (!atual?.id) return
  const confirmado = await dialogo.confirmar({
    titulo: `Excluir ${atual.nome}?`,
    mensagem: 'Os bots que usam esta ferramenta deixam de usar. Não dá para desfazer.',
    textoConfirmar: 'Excluir',
    perigo: true,
  })
  if (!confirmado) return
  erro.value = ''
  salvando.value = true
  try {
    await api.excluirFerramenta(atual.id)
    ferramentas.value = ferramentas.value.filter((f) => f.id !== atual.id)
    form.value = null
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao excluir a ferramenta'
  } finally {
    salvando.value = false
  }
}

async function testar() {
  const ferramenta = salva.value
  if (!ferramenta) return
  testando.value = true
  teste.value = null
  try {
    const argumentos = Object.fromEntries(Object.entries(exemplo.value).filter(([, valor]) => valor !== ''))
    teste.value = await api.testarFerramenta(ferramenta.id, argumentos)
  } catch (e) {
    teste.value = { ok: false, status: 0, resposta: '', erro: e instanceof Error ? e.message : 'Erro ao testar', milissegundos: 0 }
  } finally {
    testando.value = false
  }
}
</script>
