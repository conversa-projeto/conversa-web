<template>
  <div class="space-y-4">
    <p v-if="carregando" class="text-sm text-surface-500">Carregando...</p>
    <p v-else-if="!form" class="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>

    <form v-else class="space-y-4" @submit.prevent="salvar">
      <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
        Valem para todos os usuários e entram em vigor ao salvar, sem reiniciar o servidor.
      </section>

      <template v-if="parte === 'geral'">
      <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
        <h4 class="text-sm font-semibold text-surface-800">Cadastro</h4>
        <label class="mt-3 flex cursor-pointer items-start gap-3">
          <input v-model="form.cadastro_aberto" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600 dark:accent-primary-500" />
          <span>
            <span class="block text-sm text-surface-800">Permitir que as pessoas se cadastrem</span>
            <span class="block text-xs text-surface-500">Desligado, a tela de entrada não oferece o cadastro: só quem tem a permissão Usuários cria contas, em Pessoas › Usuários.</span>
          </span>
        </label>
      </section>

      <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
        <h4 class="text-sm font-semibold text-surface-800">Notificações (Firebase)</h4>
        <p class="mt-1 text-xs text-surface-500">Conta de serviço do Firebase Cloud Messaging, usada para avisar quem está com o app fechado.</p>
        <div class="mt-3 space-y-3">
          <label class="block text-sm text-surface-700">
            ID do projeto
            <input v-model="form.fcm_project_id" type="text" :class="[CAMPO, 'w-full']" autocomplete="off" />
          </label>
          <label class="block text-sm text-surface-700">
            E-mail da conta de serviço
            <input v-model="form.fcm_client_email" type="text" :class="[CAMPO, 'w-full']" autocomplete="off" />
          </label>
          <label class="block text-sm text-surface-700">
            Chave privada
            <span class="ml-1 text-xs" :class="chaveConfigurada ? 'text-success-600' : 'text-warning-600'">
              {{ chaveConfigurada ? '(configurada)' : '(não configurada)' }}
            </span>
            <textarea
              v-model="novaChave"
              rows="3"
              :class="[CAMPO, 'w-full font-mono']"
              :placeholder="chaveConfigurada ? 'Deixe em branco para manter a atual' : '-----BEGIN PRIVATE KEY-----...'"
              autocomplete="off"
            ></textarea>
            <span class="text-xs text-surface-500">A chave salva nunca é mostrada. Cole o campo private_key do JSON da conta de serviço para trocar.</span>
          </label>
        </div>
      </section>

      <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
        <h4 class="text-sm font-semibold text-surface-800">Chamadas</h4>
        <div class="mt-3 space-y-3">
          <label class="flex cursor-pointer items-start gap-3">
            <input v-model="form.turn_forcar_relay" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600 dark:accent-primary-500" />
            <span>
              <span class="block text-sm text-surface-800">Forçar relay pelo TURN</span>
              <span class="block text-xs text-surface-500">Toda a mídia das chamadas passa pelo servidor TURN. Use quando redes com firewall não conectam direto.</span>
            </span>
          </label>
          <label class="block text-sm text-surface-700">
            Guardar as gravações por (dias)
            <input v-model.number="form.gravacao_dias" type="number" min="0" max="36500" :class="[CAMPO, 'w-32']" />
            <span class="block text-xs text-surface-500">0 guarda para sempre. As mais antigas são apagadas automaticamente.</span>
          </label>
        </div>
      </section>

      <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
        <h4 class="text-sm font-semibold text-surface-800">Transcrição de áudio</h4>
        <div class="mt-3 space-y-3">
          <label class="block text-sm text-surface-700">
            Endereço do transcritor
            <input v-model="form.transcritor_url" type="text" :class="[CAMPO, 'w-full']" placeholder="http://transcritor:8000" autocomplete="off" />
            <span class="block text-xs text-surface-500">Em branco desliga o botão Transcrever.</span>
          </label>
          <label class="block text-sm text-surface-700">
            Idioma
            <input v-model="form.transcritor_idioma" type="text" :class="[CAMPO, 'w-32']" placeholder="pt" autocomplete="off" />
          </label>
        </div>
      </section>

      </template>

      <section v-if="parte === 'ia'" class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
        <h4 class="text-sm font-semibold text-surface-800">Inteligência artificial</h4>
        <p class="mt-1 text-xs text-surface-500">
          Servidor no padrão da OpenAI (vLLM, Ollama ou OpenAI), usado no resumo das conversas.
          As mensagens resumidas são enviadas a ele: prefira um servidor da sua rede.
        </p>
        <div class="mt-3 space-y-3">
          <label class="block text-sm text-surface-700">
            Endereço
            <input v-model="form.ia_url" type="text" :class="[CAMPO, 'w-full']" placeholder="http://ollama:11434/v1" autocomplete="off" />
            <span class="block text-xs text-surface-500">Com ou sem o /v1. Em branco desliga os recursos de IA.</span>
          </label>
          <label class="block text-sm text-surface-700">
            Modelo
            <input v-model="form.ia_modelo" type="text" :class="[CAMPO, 'w-full']" placeholder="llama3.1, qwen2.5:14b, gpt-4o-mini..." autocomplete="off" />
          </label>
          <label class="block text-sm text-surface-700">
            Token
            <span class="ml-1 text-xs" :class="tokenIaConfigurado ? 'text-success-600' : 'text-surface-500'">
              {{ tokenIaConfigurado ? (removerTokenIa ? '(será removido)' : '(configurado)') : '(sem token)' }}
            </span>
            <input
              v-model="novoTokenIa"
              type="password"
              :class="[CAMPO, 'w-full']"
              :placeholder="tokenIaConfigurado ? 'Deixe em branco para manter o atual' : 'Só se o servidor pedir (Ollama não pede)'"
              autocomplete="new-password"
            />
            <span class="block text-xs text-surface-500">
              O token salvo nunca é mostrado.
              <button v-if="tokenIaConfigurado" type="button" class="underline" @click="removerTokenIa = !removerTokenIa; novoTokenIa = ''">
                {{ removerTokenIa ? 'Manter o token' : 'Remover o token' }}
              </button>
            </span>
          </label>
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="rounded-xl border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-600/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-400/10"
              :disabled="testandoIa || !form.ia_url.trim() || !form.ia_modelo.trim()"
              @click="testarIa"
            >
              {{ testandoIa ? 'Testando...' : 'Testar conexão' }}
            </button>
            <span v-if="testeIa" class="text-xs" :class="testeIa.ok ? 'text-success-600' : 'text-danger-600'">
              {{ testeIa.ok ? `Funcionando (${(testeIa.milissegundos / 1000).toFixed(1)} s): "${testeIa.resposta}"` : testeIa.erro }}
            </span>
          </div>

          <div class="space-y-3 border-t border-surface-200 pt-3">
            <h5 class="text-sm font-medium text-surface-800">Embeddings (base de conhecimento dos bots)</h5>
            <label class="block text-sm text-surface-700">
              Endereço do servidor de embeddings
              <input v-model="form.ia_embeddings_url" type="text" :class="[CAMPO, 'w-full']" placeholder="Vazio: o mesmo servidor da IA" autocomplete="off" />
              <span class="block text-xs text-surface-500">Só se os embeddings rodarem em outro host ou porta, ex.: http://192.168.0.20:1234.</span>
            </label>
            <label v-if="form.ia_embeddings_url.trim()" class="block text-sm text-surface-700">
              Token do servidor de embeddings
              <span class="ml-1 text-xs" :class="tokenEmbeddingsConfigurado ? 'text-success-600' : 'text-surface-500'">
                {{ tokenEmbeddingsConfigurado ? (removerTokenEmbeddings ? '(será removido)' : '(configurado)') : '(sem token)' }}
              </span>
              <input
                v-model="novoTokenEmbeddings"
                type="password"
                :class="[CAMPO, 'w-full']"
                :placeholder="tokenEmbeddingsConfigurado ? 'Deixe em branco para manter o atual' : 'Só se o servidor pedir'"
                autocomplete="new-password"
              />
              <span class="block text-xs text-surface-500">
                O token da IA não vai para este servidor; o salvo aqui nunca é mostrado.
                <button v-if="tokenEmbeddingsConfigurado" type="button" class="underline" @click="removerTokenEmbeddings = !removerTokenEmbeddings; novoTokenEmbeddings = ''">
                  {{ removerTokenEmbeddings ? 'Manter o token' : 'Remover o token' }}
                </button>
              </span>
            </label>
            <label class="block text-sm text-surface-700">
              Modelo de embeddings
              <input v-model="form.ia_modelo_embeddings" type="text" :class="[CAMPO, 'w-full']" placeholder="nomic-embed-text, text-embedding-3-small..." autocomplete="off" />
              <span class="block text-xs text-surface-500">Vazio desliga a base. Trocou de modelo: use "Reindexar tudo" em Conhecimento.</span>
            </label>
            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                class="rounded-xl border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-600/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-400/10"
                :disabled="testandoEmbeddings || !(form.ia_embeddings_url.trim() || form.ia_url.trim()) || !form.ia_modelo_embeddings.trim()"
                @click="testarEmbeddings"
              >
                {{ testandoEmbeddings ? 'Testando...' : 'Testar embeddings' }}
              </button>
              <span v-if="testeEmbeddings" class="text-xs" :class="testeEmbeddings.ok ? 'text-success-600' : 'text-danger-600'">
                {{ testeEmbeddings.ok ? `Funcionando (${(testeEmbeddings.milissegundos / 1000).toFixed(1)} s): vetores de ${testeEmbeddings.dimensoes} dimensões` : testeEmbeddings.erro }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="parte === 'geral'" class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
        <h4 class="text-sm font-semibold text-surface-800">Armazenamento</h4>
        <p class="mt-2 text-sm text-surface-700">Bucket dos anexos: <span class="font-mono">{{ form.s3_bucket || '(vazio)' }}</span></p>
        <p class="mt-1 text-xs text-surface-500">Não muda por aqui: os anexos já enviados ficariam no bucket anterior.</p>
      </section>

      <p v-if="erro" class="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>
      <p v-if="salvo" class="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-700 dark:bg-success-900 dark:text-success-400">Configurações salvas.</p>

      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="salvando || !alterado"
          class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {{ salvando ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import * as api from '../services/conversaApi'
import { useRecursos } from '../composables/useRecursos'
import type { AlteracaoParametros, ParametrosSistema, TesteEmbeddings, TesteIa } from '../types/api'

// A parte da IA fica no menu IA; as duas salvam só o que mudou
const { parte = 'geral' } = defineProps<{ parte?: 'geral' | 'ia' }>()

const CAMPO = 'mt-1 block rounded-xl border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100'

const original = ref<ParametrosSistema | null>(null)
const form = ref<ParametrosSistema | null>(null)
const novaChave = ref('')
const carregando = ref(true)
const salvando = ref(false)
const salvo = ref(false)
const erro = ref('')

const chaveConfigurada = computed(() => !!original.value?.fcm_private_key_configurada)
const novoTokenIa = ref('')
const removerTokenIa = ref(false)
const tokenIaConfigurado = computed(() => !!original.value?.ia_token_configurado)
const testandoIa = ref(false)
const testeIa = ref<TesteIa | null>(null)
const novoTokenEmbeddings = ref('')
const removerTokenEmbeddings = ref(false)
const tokenEmbeddingsConfigurado = computed(() => !!original.value?.ia_embeddings_token_configurado)
const testandoEmbeddings = ref(false)
const testeEmbeddings = ref<TesteEmbeddings | null>(null)

const CAMPOS = ['fcm_project_id', 'fcm_client_email', 'turn_forcar_relay', 'transcritor_url', 'transcritor_idioma', 'gravacao_dias', 'ia_url', 'ia_modelo', 'cadastro_aberto', 'ia_modelo_embeddings', 'ia_embeddings_url'] as const

// Só o que mudou vai para o servidor; a chave, só se foi digitada
const alteracao = computed<AlteracaoParametros>(() => {
  const mudancas: AlteracaoParametros = {}
  if (!form.value || !original.value) return mudancas
  for (const campo of CAMPOS) {
    if (form.value[campo] !== original.value[campo]) {
      Object.assign(mudancas, { [campo]: form.value[campo] })
    }
  }
  if (novaChave.value.trim()) mudancas.fcm_private_key = novaChave.value
  if (novoTokenIa.value.trim()) mudancas.ia_token = novoTokenIa.value
  else if (removerTokenIa.value) mudancas.ia_token = ''
  if (novoTokenEmbeddings.value.trim()) mudancas.ia_embeddings_token = novoTokenEmbeddings.value
  else if (removerTokenEmbeddings.value) mudancas.ia_embeddings_token = ''
  return mudancas
})

const alterado = computed(() => Object.keys(alteracao.value).length > 0)

function aplicar(parametros: ParametrosSistema) {
  original.value = parametros
  form.value = { ...parametros }
  novaChave.value = ''
  novoTokenIa.value = ''
  removerTokenIa.value = false
  novoTokenEmbeddings.value = ''
  removerTokenEmbeddings.value = false
}

// Testa o que está na tela, antes de salvar; token em branco usa o salvo
async function testarIa() {
  if (!form.value) return
  testandoIa.value = true
  testeIa.value = null
  try {
    testeIa.value = await api.testarIa({
      url: form.value.ia_url,
      modelo: form.value.ia_modelo,
      ...(novoTokenIa.value.trim() ? { token: novoTokenIa.value } : {}),
    })
  } catch (e) {
    testeIa.value = { ok: false, resposta: '', erro: e instanceof Error ? e.message : 'Erro ao testar', milissegundos: 0 }
  } finally {
    testandoIa.value = false
  }
}

// Com endereço próprio, o token digitado é o dos embeddings; sem, o da IA
async function testarEmbeddings() {
  if (!form.value) return
  testandoEmbeddings.value = true
  testeEmbeddings.value = null
  const proprio = form.value.ia_embeddings_url.trim()
  const token = proprio ? novoTokenEmbeddings.value.trim() : novoTokenIa.value.trim()
  try {
    testeEmbeddings.value = await api.testarEmbeddings({
      url: proprio,
      url_ia: form.value.ia_url,
      modelo: form.value.ia_modelo_embeddings,
      ...(token ? { token } : {}),
    })
  } catch (e) {
    testeEmbeddings.value = { ok: false, dimensoes: 0, erro: e instanceof Error ? e.message : 'Erro ao testar', milissegundos: 0 }
  } finally {
    testandoEmbeddings.value = false
  }
}

onMounted(async () => {
  try {
    aplicar(await api.getParametros())
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao carregar as configurações'
  } finally {
    carregando.value = false
  }
})

const { recarregar: recarregarRecursos } = useRecursos()

async function salvar() {
  if (!alterado.value) return
  salvando.value = true
  salvo.value = false
  erro.value = ''
  try {
    aplicar(await api.alterarParametros(alteracao.value))
    salvo.value = true
    void recarregarRecursos()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao salvar as configurações'
  } finally {
    salvando.value = false
  }
}
</script>
