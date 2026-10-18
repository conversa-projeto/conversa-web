<template>
  <div class="space-y-4">
    <p v-if="carregando" class="text-sm text-surface-500">Carregando...</p>

    <template v-else-if="dados">
      <section v-if="dados.modo_aberto" class="rounded-2xl border border-warning-300 bg-warning-50 p-4 text-sm text-warning-800 dark:bg-warning-900/30 dark:text-warning-300">
        <strong>Ninguém tem a permissão Pessoas ainda:</strong> todos os usuários podem mexer nas configurações e nas permissões.
        Marque Sistema e Pessoas para quem deve cuidar disso; ao marcar Pessoas para alguém, só passa a valer o que estiver marcado.
      </section>

      <p class="text-xs text-surface-500">
        Ninguém retira as próprias permissões: outra pessoa com a permissão Pessoas precisa fazer isso.
      </p>

      <input
        v-model="busca"
        type="text"
        placeholder="Buscar usuário"
        class="w-full rounded-xl border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />

      <p v-if="erro" class="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>

      <section class="overflow-hidden rounded-2xl border border-surface-200 bg-surface-50">
        <div v-for="usuario in usuariosFiltrados" :key="usuario.id" class="border-t border-surface-200 first:border-t-0">
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-surface-100"
            :aria-expanded="aberto === usuario.id"
            @click="aberto = aberto === usuario.id ? null : usuario.id"
          >
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate text-sm text-surface-800">{{ usuario.nome }}<span v-if="usuario.id === auth.user?.id" class="text-surface-500"> (você)</span></span>
                <span v-if="usuario.bot" class="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">Bot</span>
              </span>
              <span class="block truncate text-xs text-surface-500">{{ usuario.login }}</span>
            </span>
            <span
              v-if="temAdministracao(usuario)"
              class="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300"
              :title="nomesAdministracao(usuario)"
            >Administração</span>
            <!-- Colunas de largura fixa, alinhadas à direita: uma não empurra a outra -->
            <span class="w-16 shrink-0 text-right text-xs tabular-nums text-surface-500" title="Espaço dos arquivos que enviou">{{ formatarTamanho(usuario.espaco) }}</span>
            <span class="w-[4.5rem] shrink-0 text-right text-xs tabular-nums text-surface-500" title="Usuário desde">{{ usuario.criado_em?.toLocaleDateString('pt-BR') }}</span>
            <span class="w-14 shrink-0 text-right text-xs tabular-nums text-surface-500">{{ totalPermissoes(usuario) }} de {{ dados.permissoes.length }}</span>
            <svg class="h-4 w-4 shrink-0 text-surface-500 transition-transform" :class="aberto === usuario.id ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" />
            </svg>
          </button>

          <div v-if="aberto === usuario.id && podeSip(usuario)" class="flex gap-1 bg-surface-50 px-4 pt-3" role="tablist">
            <button
              v-for="aba in ABAS_USUARIO"
              :key="aba.id"
              type="button"
              role="tab"
              :aria-selected="abaUsuario === aba.id"
              class="rounded-lg px-3 py-1.5 text-xs font-medium"
              :class="abaUsuario === aba.id ? 'bg-primary-600 text-white' : 'text-surface-600 hover:bg-surface-100'"
              @click="abaUsuario = aba.id"
            >{{ aba.titulo }}</button>
          </div>

          <div v-if="aberto === usuario.id && abaUsuario === 'sip' && podeSip(usuario)" class="bg-surface-50 px-4 py-3">
            <ConfiguracaoSipUsuario :usuario="usuario" />
          </div>

          <div v-else-if="aberto === usuario.id" class="grid gap-4 bg-surface-50 px-4 py-3 sm:grid-cols-2">
            <fieldset v-for="grupo in grupos" :key="grupo.titulo">
              <legend class="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">{{ grupo.titulo }}</legend>
              <label
                v-for="permissao in grupo.permissoes"
                :key="permissao.codigo"
                class="flex items-start gap-2 py-1 text-sm text-surface-700"
                :title="tituloTravada(usuario, permissao.codigo) || permissao.descricao"
              >
                <input
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600 disabled:opacity-50 dark:accent-primary-500"
                  :checked="usuario.permissoes.includes(permissao.codigo)"
                  :disabled="travada(usuario, permissao.codigo)"
                  :aria-label="`${nomes[permissao.codigo] ?? permissao.descricao} para ${usuario.nome}`"
                  @change="alternar(usuario, permissao.codigo, $event.target as HTMLInputElement)"
                />
                <span>{{ nomes[permissao.codigo] ?? permissao.descricao }}</span>
              </label>
            </fieldset>
          </div>
        </div>
        <p v-if="usuariosFiltrados.length === 0" class="px-4 py-3 text-sm text-surface-500">Nenhum usuário encontrado.</p>
      </section>
    </template>

    <p v-else class="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import * as api from '../services/conversaApi'
import { useAuthStore } from '../stores/auth'
import { CodigoPermissao, type PermissoesSistema } from '../types/api'
import { GRUPOS_USO, NOMES_PERMISSAO } from '../utils/permissoesUso'
import { formatarTamanho } from '../utils/formatters'
import ConfiguracaoSipUsuario from './ConfiguracaoSipUsuario.vue'

const auth = useAuthStore()

type Permissao = PermissoesSistema['permissoes'][number]
type UsuarioPermissoes = PermissoesSistema['usuarios'][number]

const nomes = NOMES_PERMISSAO
const GRUPOS = GRUPOS_USO

const dados = ref<PermissoesSistema | null>(null)
const carregando = ref(true)
const erro = ref('')
const busca = ref('')
const alterando = ref('')
const aberto = ref<number | null>(null)

// No painel de cada pessoa: os acessos e, para quem configura o SIP, o ramal
const ABAS_USUARIO = [
  { id: 'acessos', titulo: 'Acessos' },
  { id: 'sip', titulo: 'Telefonia (SIP)' },
] as const
const abaUsuario = ref<(typeof ABAS_USUARIO)[number]['id']>('acessos')

// Bot não liga: o ramal é só de pessoa
function podeSip(usuario: UsuarioPermissoes) {
  return !usuario.bot && auth.temPermissao(CodigoPermissao.Sip)
}

const chave = (usuarioId: number, codigo: string) => `${usuarioId}:${codigo}`

const administracao = computed(() => dados.value?.permissoes.filter((p) => !p.uso) ?? [])
const uso = computed(() => dados.value?.permissoes.filter((p) => p.uso) ?? [])

// Administração primeiro, depois as de uso nos grupos delas. Permissão de uso
// que o servidor criar e não estiver num grupo daqui fica em "Outras"
const grupos = computed(() => {
  const porCodigo = new Map(uso.value.map((p) => [p.codigo, p]))
  const deUso = GRUPOS
    .map((grupo) => ({ titulo: grupo.titulo, permissoes: grupo.codigos.map((c) => porCodigo.get(c)).filter((p): p is Permissao => !!p) }))
    .filter((grupo) => grupo.permissoes.length)
  const conhecidos = new Set(GRUPOS.flatMap((grupo) => grupo.codigos))
  const outras = uso.value.filter((p) => !conhecidos.has(p.codigo))
  return [
    ...(administracao.value.length ? [{ titulo: 'Administração', permissoes: administracao.value }] : []),
    ...deUso,
    ...(outras.length ? [{ titulo: 'Outras', permissoes: outras }] : []),
  ]
})

const usuariosFiltrados = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  const usuarios = dados.value?.usuarios ?? []
  return termo ? usuarios.filter((u) => u.nome.toLowerCase().includes(termo) || u.login.toLowerCase().includes(termo)) : usuarios
})

function totalPermissoes(usuario: UsuarioPermissoes) {
  return (dados.value?.permissoes ?? []).filter((p) => usuario.permissoes.includes(p.codigo)).length
}

function temAdministracao(usuario: UsuarioPermissoes) {
  return administracao.value.some((p) => usuario.permissoes.includes(p.codigo))
}

function nomesAdministracao(usuario: UsuarioPermissoes) {
  return administracao.value.filter((p) => usuario.permissoes.includes(p.codigo)).map((p) => nomes[p.codigo] ?? p.codigo).join(', ')
}

// As próprias, marcadas, ficam travadas: o servidor não deixa retirar
function propriaMarcada(usuario: UsuarioPermissoes, codigo: string) {
  return usuario.id === auth.user?.id && usuario.permissoes.includes(codigo)
}

function travada(usuario: UsuarioPermissoes, codigo: string) {
  return alterando.value === chave(usuario.id, codigo) || propriaMarcada(usuario, codigo)
}

function tituloTravada(usuario: UsuarioPermissoes, codigo: string) {
  return propriaMarcada(usuario, codigo) ? 'Você não pode retirar as próprias permissões' : undefined
}

onMounted(async () => {
  try {
    dados.value = await api.getPermissoes()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao carregar as permissões'
  } finally {
    carregando.value = false
  }
})

async function alternar(usuario: UsuarioPermissoes, codigo: string, caixa: HTMLInputElement) {
  const marcar = caixa.checked
  erro.value = ''
  alterando.value = chave(usuario.id, codigo)
  try {
    if (marcar) {
      await api.concederPermissao(usuario.id, codigo)
      usuario.permissoes = [...usuario.permissoes, codigo]
      // A primeira de Acessos encerra o modo aberto
      if (codigo === CodigoPermissao.Permissoes && dados.value) dados.value.modo_aberto = false
    } else {
      await api.retirarPermissao(usuario.id, codigo)
      usuario.permissoes = usuario.permissoes.filter((p) => p !== codigo)
    }
    // As telas que aparecem para você acompanham: mexeu nas próprias, ou
    // acabou o modo aberto (em que você tinha todas)
    await auth.carregarPermissoes()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao alterar a permissão'
    // A caixa volta ao que estava
    caixa.checked = !marcar
  } finally {
    alterando.value = ''
  }
}
</script>
