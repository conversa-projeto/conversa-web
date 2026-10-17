<template>
  <div class="space-y-4">
    <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
      Cada bot é um usuário do chat que responde com a IA. Ele aparece nos contatos: na conversa direta responde a toda mensagem; num grupo,
      quando é mencionado (@Nome) ou quando respondem a uma mensagem dele. O que ele pode fazer segue as permissões de uso dele.
    </section>

    <p v-if="!recursos.ia" class="rounded-xl bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:bg-warning-900/30 dark:text-warning-300">
      A IA está desligada: os bots não respondem e não dá para criar novos. Configure o servidor de IA em Sistema.
    </p>

    <p v-if="erro" class="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>

    <p v-if="carregando" class="text-sm text-surface-500">Carregando...</p>

    <template v-else>
      <form v-if="form" class="space-y-3 rounded-2xl border border-surface-200 bg-surface-50 p-4" @submit.prevent="salvar">
        <h4 class="text-sm font-semibold text-surface-800">{{ form.id ? `Editar ${editando?.nome}` : 'Novo bot' }}</h4>
        <label class="block text-sm text-surface-700">
          Nome
          <input v-model="form.nome" type="text" maxlength="60" :class="[CAMPO, 'w-full']" placeholder="Ex.: Assistente de Compras" />
        </label>
        <label class="block text-sm text-surface-700">
          Instruções (personalidade e o que ele faz)
          <textarea
            v-model="form.instrucoes"
            rows="8"
            maxlength="8000"
            :class="[CAMPO, 'w-full']"
            placeholder="Ex.: Você é simpático e direto. Ajuda a equipe com dúvidas sobre pedidos de compra: prazos, aprovações e fornecedores. Quando não souber, diga que não sabe."
          ></textarea>
          <span class="block text-right text-xs text-surface-500">{{ form.instrucoes.length }} / 8000</span>
        </label>

        <template v-if="editando">
          <label class="flex cursor-pointer items-center gap-3 text-sm text-surface-800">
            <input v-model="form.ativo" type="checkbox" class="h-4 w-4 accent-primary-600 dark:accent-primary-500" />
            Ligado (desligado, não responde a ninguém)
          </label>

          <div>
            <p class="text-sm font-medium text-surface-800">O que ele pode fazer</p>
            <p class="text-xs text-surface-500">
              Muda na hora. Texto ele sempre envia;
              {{ auth.temPermissao(CodigoPermissao.Permissoes) ? 'você pode liberar qualquer uma.' : 'você só libera o que você mesmo pode fazer.' }}
            </p>
            <div class="mt-2 grid gap-4 sm:grid-cols-2">
              <fieldset v-for="grupo in GRUPOS_USO" :key="grupo.titulo">
                <legend class="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">{{ grupo.titulo }}</legend>
                <label
                  v-for="codigo in grupo.codigos"
                  :key="codigo"
                  class="flex items-start gap-2 py-1 text-sm text-surface-700"
                  :title="podeLiberar(codigo) || editando.permissoes.includes(codigo) ? undefined : 'Você não tem esta permissão'"
                >
                  <input
                    type="checkbox"
                    class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600 disabled:opacity-50 dark:accent-primary-500"
                    :checked="editando.permissoes.includes(codigo)"
                    :disabled="alterandoPermissao || (!podeLiberar(codigo) && !editando.permissoes.includes(codigo))"
                    @change="alternarPermissao(codigo, $event.target as HTMLInputElement)"
                  />
                  <span>{{ NOMES_PERMISSAO[codigo] }}</span>
                </label>
              </fieldset>
            </div>
          </div>

          <div>
            <p class="text-sm font-medium text-surface-800">Bases de conhecimento</p>
            <p class="text-xs text-surface-500">Documentos que ele consulta para responder (cadastrados em Conhecimento). Muda na hora.</p>
            <p v-if="basesDisponiveis.length === 0" class="mt-2 text-xs text-surface-500">Nenhuma base cadastrada.</p>
            <label v-for="base in basesDisponiveis" :key="base.id" class="flex items-start gap-2 py-1 text-sm text-surface-700" :title="base.descricao">
              <input
                type="checkbox"
                class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600 dark:accent-primary-500"
                :checked="editando.bases.includes(base.id)"
                :disabled="alterandoPermissao"
                @change="alternarBase(base.id, $event.target as HTMLInputElement)"
              />
              <span class="min-w-0">
                <span class="block">{{ base.nome }}</span>
                <span v-if="base.descricao" class="block truncate text-xs text-surface-500">{{ base.descricao }}</span>
              </span>
            </label>
          </div>

          <div>
            <p class="text-sm font-medium text-surface-800">Ferramentas externas</p>
            <p class="text-xs text-surface-500">APIs que ele pode chamar para buscar informação de fora do chat (cadastradas em Ferramentas). Muda na hora.</p>
            <p v-if="disponiveis.length === 0" class="mt-2 text-xs text-surface-500">Nenhuma ferramenta cadastrada.</p>
            <label v-for="ferramenta in disponiveis" :key="ferramenta.id" class="flex items-start gap-2 py-1 text-sm text-surface-700" :title="ferramenta.descricao">
              <input
                type="checkbox"
                class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600 dark:accent-primary-500"
                :checked="editando.ferramentas.includes(ferramenta.id)"
                :disabled="alterandoPermissao"
                @change="alternarFerramenta(ferramenta.id, $event.target as HTMLInputElement)"
              />
              <span class="min-w-0">
                <span class="block font-mono">{{ ferramenta.nome }}</span>
                <span class="block truncate text-xs text-surface-500">{{ ferramenta.descricao }}</span>
              </span>
            </label>
          </div>
        </template>

        <div class="flex justify-end gap-2">
          <button
            v-if="editando"
            type="button"
            :disabled="salvando"
            class="mr-auto rounded-xl px-4 py-2 text-sm text-danger-600 hover:bg-danger-500/10 disabled:opacity-50 dark:text-danger-400"
            @click="excluir"
          >Excluir bot</button>
          <button type="button" class="rounded-xl border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-600/10 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-400/10" @click="fechar">Cancelar</button>
          <button
            type="submit"
            :disabled="salvando || !form.nome.trim() || !form.instrucoes.trim() || (!form.id && !recursos.ia)"
            class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {{ salvando ? 'Salvando...' : form.id ? 'Salvar' : 'Criar bot' }}
          </button>
        </div>
      </form>

      <div v-else-if="auth.temPermissao(CodigoPermissao.Bots)" class="flex justify-end">
        <button
          type="button"
          :disabled="!recursos.ia"
          class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          @click="novo"
        >Novo bot</button>
      </div>

      <section class="overflow-hidden rounded-2xl border border-surface-200">
        <div v-for="bot in bots" :key="bot.id" class="flex items-center gap-3 border-t border-surface-200 px-4 py-3 first:border-t-0">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
            {{ inicialNome(bot.nome) }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-2">
              <span class="truncate text-sm text-surface-800">{{ bot.nome }}</span>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                :class="bot.ativo ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300' : 'bg-surface-200 text-surface-600'"
              >{{ bot.ativo ? 'Ligado' : 'Desligado' }}</span>
            </span>
            <span class="block truncate text-xs text-surface-500">
              {{ bot.login }}<template v-if="bot.criado_por !== auth.user?.id && bot.criado_por_nome"> · criado por {{ bot.criado_por_nome }}</template>
            </span>
          </span>
          <button type="button" class="shrink-0 rounded-lg px-3 py-1.5 text-sm text-primary-600 hover:bg-surface-200 dark:text-primary-400" @click="editar(bot)">Editar</button>
        </div>
        <p v-if="bots.length === 0" class="px-4 py-3 text-sm text-surface-500">Nenhum bot ainda.</p>
      </section>
    </template>

    <DialogoConfirmacao :dialogo="dialogo.aberto.value" @responder="dialogo.responderDialogo" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import * as api from '../services/conversaApi'
import { useAuthStore } from '../stores/auth'
import { useRecursos } from '../composables/useRecursos'
import { CodigoPermissao, type BaseConhecimento, type Bot, type FerramentaExterna } from '../types/api'
import { GRUPOS_USO, NOMES_PERMISSAO } from '../utils/permissoesUso'
import { inicialNome } from '../utils/formatters'
import { useDialogo } from '../composables/useDialogo'
import DialogoConfirmacao from './DialogoConfirmacao.vue'

const CAMPO = 'mt-1 block rounded-xl border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100'

const auth = useAuthStore()
const { recursos } = useRecursos()
const dialogo = useDialogo()

const bots = ref<Bot[]>([])
const carregando = ref(true)
const erro = ref('')
const salvando = ref(false)
const alterandoPermissao = ref(false)
const basesDisponiveis = ref<Pick<BaseConhecimento, 'id' | 'nome' | 'descricao'>[]>([])
const disponiveis = ref<Pick<FerramentaExterna, 'id' | 'nome' | 'descricao'>[]>([])
const form = ref<{ id: number | null; nome: string; instrucoes: string; ativo: boolean } | null>(null)

const editando = computed(() => (form.value?.id ? bots.value.find((bot) => bot.id === form.value!.id) ?? null : null))

// Quem cuida dos acessos libera qualquer uma; quem criou, só as que tem
function podeLiberar(codigo: string) {
  return auth.temPermissao(CodigoPermissao.Permissoes) || auth.temPermissao(codigo)
}

onMounted(async () => {
  // Sem a lista (servidor antigo, por exemplo), a seção só fica vazia
  api.getFerramentasDisponiveis().then((lista) => { disponiveis.value = lista }).catch(() => {})
  api.getBasesDisponiveis().then((lista) => { basesDisponiveis.value = lista }).catch(() => {})
  try {
    bots.value = await api.getBots()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao carregar os bots'
  } finally {
    carregando.value = false
  }
})

function novo() {
  erro.value = ''
  form.value = { id: null, nome: '', instrucoes: '', ativo: true }
}

function editar(bot: Bot) {
  erro.value = ''
  form.value = { id: bot.id, nome: bot.nome, instrucoes: bot.instrucoes, ativo: bot.ativo }
}

function fechar() {
  form.value = null
}

function trocar(bot: Bot) {
  const indice = bots.value.findIndex((b) => b.id === bot.id)
  if (indice >= 0) bots.value.splice(indice, 1, bot)
  else bots.value = [...bots.value, bot].sort((a, b) => a.nome.localeCompare(b.nome))
}

async function salvar() {
  const atual = form.value
  if (!atual) return
  erro.value = ''
  salvando.value = true
  try {
    if (atual.id) {
      const original = editando.value
      const campos = {
        ...(atual.nome.trim() !== original?.nome ? { nome: atual.nome } : {}),
        ...(atual.instrucoes.trim() !== original?.instrucoes ? { instrucoes: atual.instrucoes } : {}),
        ...(atual.ativo !== original?.ativo ? { ativo: atual.ativo } : {}),
      }
      if (Object.keys(campos).length) trocar(await api.alterarBot(atual.id, campos))
    } else {
      trocar(await api.criarBot(atual.nome, atual.instrucoes))
    }
    form.value = null
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao salvar o bot'
  } finally {
    salvando.value = false
  }
}

// As mensagens que ele já mandou ficam nas conversas, com o nome dele
async function excluir() {
  const bot = editando.value
  if (!bot) return
  const confirmado = await dialogo.confirmar({
    titulo: `Excluir ${bot.nome}?`,
    mensagem: 'Ele sai de todas as conversas, some dos contatos e não responde mais. O que ele já escreveu continua nas conversas. Não dá para desfazer.',
    textoConfirmar: 'Excluir',
    perigo: true,
  })
  if (!confirmado) return
  erro.value = ''
  salvando.value = true
  try {
    await api.excluirBot(bot.id)
    bots.value = bots.value.filter((b) => b.id !== bot.id)
    form.value = null
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao excluir o bot'
  } finally {
    salvando.value = false
  }
}

async function alternarBase(id: number, caixa: HTMLInputElement) {
  const bot = editando.value
  if (!bot) return
  const marcar = caixa.checked
  erro.value = ''
  alterandoPermissao.value = true
  try {
    const bases = marcar ? [...bot.bases, id] : bot.bases.filter((b) => b !== id)
    trocar(await api.definirConhecimentoBot(bot.id, bases))
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao alterar as bases'
    caixa.checked = !marcar
  } finally {
    alterandoPermissao.value = false
  }
}

async function alternarFerramenta(id: number, caixa: HTMLInputElement) {
  const bot = editando.value
  if (!bot) return
  const marcar = caixa.checked
  erro.value = ''
  alterandoPermissao.value = true
  try {
    const ferramentas = marcar ? [...bot.ferramentas, id] : bot.ferramentas.filter((f) => f !== id)
    trocar(await api.definirFerramentasBot(bot.id, ferramentas))
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao alterar as ferramentas'
    caixa.checked = !marcar
  } finally {
    alterandoPermissao.value = false
  }
}

async function alternarPermissao(codigo: string, caixa: HTMLInputElement) {
  const bot = editando.value
  if (!bot) return
  const marcar = caixa.checked
  erro.value = ''
  alterandoPermissao.value = true
  try {
    const permissoes = marcar ? [...bot.permissoes, codigo] : bot.permissoes.filter((p) => p !== codigo)
    trocar(await api.definirPermissoesBot(bot.id, permissoes))
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao alterar a permissão'
    caixa.checked = !marcar
  } finally {
    alterandoPermissao.value = false
  }
}
</script>
