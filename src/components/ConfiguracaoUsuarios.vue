<template>
  <div class="space-y-4">
    <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
      Crie contas para pessoas ou bots, já escolhendo o que cada uma pode fazer, mesmo com o cadastro pela tela de entrada fechado
      (em Sistema). Abra uma pessoa na lista para ver e mudar os acessos dela; o bot também se ajusta em Bots.
    </section>

    <p v-if="erro" class="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>
    <p v-if="criado" class="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-700 dark:bg-success-900 dark:text-success-400">{{ criado }}</p>

    <form v-if="form" class="space-y-3 rounded-2xl border border-surface-200 bg-surface-50 p-4" @submit.prevent="salvar">
      <h4 class="text-sm font-semibold text-surface-800">Novo usuário</h4>

      <div class="flex items-center gap-4">
        <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-xl font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
          <img v-if="previa" :src="previa" alt="Avatar" class="h-full w-full object-cover" />
          <span v-else>{{ inicialNome(form.nome, '?') }}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-700 hover:bg-surface-200" @click="inputAvatar?.click()">
            {{ avatar ? 'Trocar foto' : 'Escolher foto' }}
          </button>
          <button v-if="avatar" type="button" class="rounded-lg px-3 py-2 text-sm text-danger-600 hover:bg-danger-500/10 dark:text-danger-400" @click="tirarAvatar">Remover</button>
        </div>
        <input ref="inputAvatar" type="file" accept="image/*" class="hidden" aria-label="Foto do usuário" @change="escolherAvatar" />
      </div>

      <label class="flex cursor-pointer items-start gap-3">
        <input :checked="form.bot" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600 dark:accent-primary-500" @change="trocarTipo(($event.target as HTMLInputElement).checked)" />
        <span>
          <span class="block text-sm text-surface-800">É um bot de IA</span>
          <span class="block text-xs text-surface-500">Responde com a IA; não entra pelo login, então não tem login, e-mail nem senha.</span>
        </span>
      </label>
      <p v-if="form.bot && !recursos.ia" class="rounded-xl bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:bg-warning-900/30 dark:text-warning-300">
        A IA está desligada: configure o servidor de IA em Sistema para criar bots.
      </p>

      <label class="block text-sm text-surface-700">
        Nome
        <input v-model="form.nome" type="text" maxlength="60" :class="[CAMPO, 'w-full']" />
      </label>

      <label v-if="form.bot" class="block text-sm text-surface-700">
        Instruções (personalidade e o que ele faz)
        <textarea v-model="form.instrucoes" rows="6" maxlength="8000" :class="[CAMPO, 'w-full']"></textarea>
      </label>
      <div v-else class="grid gap-3 md:grid-cols-2">
        <label class="block text-sm text-surface-700">
          Login
          <input v-model="form.login" type="text" autocomplete="off" :class="[CAMPO, 'w-full']" />
        </label>
        <label class="block text-sm text-surface-700">
          E-mail
          <input v-model="form.email" type="email" autocomplete="off" :class="[CAMPO, 'w-full']" />
        </label>
        <label class="block text-sm text-surface-700">
          Senha
          <input v-model="form.senha" type="password" autocomplete="new-password" :class="[CAMPO, 'w-full']" />
          <span class="text-xs text-surface-500">Entre 4 e 72 caracteres. A pessoa pode trocar depois, se tiver a permissão.</span>
        </label>
      </div>

      <div>
        <p class="text-sm font-medium text-surface-800">Acessos</p>
        <p class="text-xs text-surface-500">
          {{ form.bot ? 'O bot só recebe permissões de uso; vem com o básico marcado.' : 'Vem com todas as de uso marcadas e nenhuma de administração.' }}
        </p>
        <p v-if="!grupos.length" class="mt-2 text-xs text-surface-500">Carregando as permissões...</p>
        <div class="mt-2 grid gap-4 sm:grid-cols-2">
          <fieldset v-for="grupo in grupos" :key="grupo.titulo">
            <legend class="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">{{ grupo.titulo }}</legend>
            <label
              v-for="permissao in grupo.permissoes"
              :key="permissao.codigo"
              class="flex items-start gap-2 py-1 text-sm text-surface-700"
              :title="permissao.descricao"
            >
              <input
                v-model="form.permissoes"
                type="checkbox"
                :value="permissao.codigo"
                class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600 dark:accent-primary-500"
              />
              <span>{{ NOMES_PERMISSAO[permissao.codigo] ?? permissao.descricao }}</span>
            </label>
          </fieldset>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <button type="button" class="rounded-xl border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-600/10 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-400/10" @click="fechar">Cancelar</button>
        <button
          type="submit"
          :disabled="salvando || !completo"
          class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >{{ salvando ? 'Criando...' : 'Criar' }}</button>
      </div>
    </form>

    <div v-else class="flex justify-end">
      <button type="button" class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700" @click="novo">Novo usuário</button>
    </div>

    <!-- A lista com os acessos de cada um; volta a carregar com a conta nova -->
    <ConfiguracaoAcessos :key="versaoLista" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import * as api from '../services/conversaApi'
import { useRecursos } from '../composables/useRecursos'
import { CodigoPermissao, TipoConteudo, type PermissoesSistema } from '../types/api'
import { inicialNome } from '../utils/formatters'
import { redimensionarImagem } from '../utils/imageResize'
import { GRUPOS_USO, NOMES_PERMISSAO } from '../utils/permissoesUso'
import ConfiguracaoAcessos from './ConfiguracaoAcessos.vue'

const CAMPO = 'mt-1 block rounded-xl border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
// O padrão do servidor para o bot, que o formulário mostra já marcado
const BASICO_BOT = [CodigoPermissao.Emoji, CodigoPermissao.Responder, CodigoPermissao.Reagir]

type Permissao = PermissoesSistema['permissoes'][number]

const { recursos } = useRecursos()

const erro = ref('')
const criado = ref('')
const salvando = ref(false)
const versaoLista = ref(0)
const permissoes = ref<Permissao[]>([])
const form = ref<{ nome: string; bot: boolean; instrucoes: string; login: string; email: string; senha: string; permissoes: string[] } | null>(null)
const inputAvatar = ref<HTMLInputElement | null>(null)
// A foto só sobe ao criar
const avatar = ref<Blob | null>(null)
const previa = ref('')

// Administração em cima (pessoa) e as de uso nos grupos delas, como no painel da lista
const grupos = computed(() => {
  const porCodigo = new Map(permissoes.value.map((p) => [p.codigo, p]))
  const deUso = GRUPOS_USO
    .map((grupo) => ({ titulo: grupo.titulo, permissoes: grupo.codigos.map((c) => porCodigo.get(c)).filter((p): p is Permissao => !!p) }))
    .filter((grupo) => grupo.permissoes.length)
  const administracao = permissoes.value.filter((p) => !p.uso)
  return form.value?.bot || !administracao.length ? deUso : [{ titulo: 'Administração', permissoes: administracao }, ...deUso]
})

const completo = computed(() => {
  const f = form.value
  if (!f || !f.nome.trim() || !permissoes.value.length) return false
  return f.bot ? !!f.instrucoes.trim() && recursos.value.ia : !!f.login.trim() && !!f.email.trim() && f.senha.length >= 4
})

onBeforeUnmount(() => {
  if (previa.value) URL.revokeObjectURL(previa.value)
})

function padrao(bot: boolean) {
  return bot ? [...BASICO_BOT] : permissoes.value.filter((p) => p.uso).map((p) => p.codigo)
}

async function novo() {
  erro.value = ''
  criado.value = ''
  form.value = { nome: '', bot: false, instrucoes: '', login: '', email: '', senha: '', permissoes: [] }
  try {
    if (!permissoes.value.length) permissoes.value = (await api.getPermissoes()).permissoes
    if (form.value) form.value.permissoes = padrao(form.value.bot)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao carregar as permissões'
  }
}

// Pessoa e bot têm padrões diferentes: trocar o tipo volta ao padrão dele
function trocarTipo(bot: boolean) {
  if (!form.value) return
  form.value.bot = bot
  form.value.permissoes = padrao(bot)
}

function tirarAvatar() {
  if (previa.value) URL.revokeObjectURL(previa.value)
  previa.value = ''
  avatar.value = null
}

function fechar() {
  tirarAvatar()
  form.value = null
}

async function escolherAvatar(evento: Event) {
  const alvo = evento.target as HTMLInputElement
  const arquivo = alvo.files?.[0]
  alvo.value = ''
  if (!arquivo) return
  try {
    const imagem = await redimensionarImagem(arquivo)
    tirarAvatar()
    avatar.value = imagem
    previa.value = URL.createObjectURL(imagem)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível usar a imagem'
  }
}

async function salvar() {
  const f = form.value
  if (!f || !completo.value) return
  erro.value = ''
  salvando.value = true
  try {
    const anexo = avatar.value ? await api.uploadAnexo(TipoConteudo.Imagem, 'avatar.jpg', 'jpg', avatar.value) : null
    const conta = await api.cadastrarUsuario({
      nome: f.nome.trim(),
      ...(anexo ? { avatar_anexo_id: Number(anexo.id) } : {}),
      ...(f.bot ? { bot: true, instrucoes: f.instrucoes } : { login: f.login.trim(), email: f.email.trim(), senha: f.senha }),
      permissoes: f.permissoes,
    })
    criado.value = conta.bot ? `Bot ${conta.nome} criado.` : `Conta de ${conta.nome} criada (login ${conta.login}).`
    versaoLista.value++
    fechar()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao criar o usuário'
  } finally {
    salvando.value = false
  }
}
</script>
