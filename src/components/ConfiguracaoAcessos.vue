<template>
  <div class="space-y-4">
    <p v-if="carregando" class="text-sm text-surface-500">Carregando...</p>

    <template v-else-if="dados">
      <section v-if="dados.modo_aberto" class="rounded-2xl border border-warning-300 bg-warning-50 p-4 text-sm text-warning-800 dark:bg-warning-900/30 dark:text-warning-300">
        <strong>Ninguém tem a permissão Acessos ainda:</strong> todos os usuários podem mexer nas configurações e nas permissões.
        Marque Sistema e Acessos para quem deve cuidar disso; ao marcar Acessos para alguém, só passa a valer o que estiver marcado.
      </section>

      <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
        <h4 class="text-sm font-semibold text-surface-800">O que cada permissão libera</h4>
        <ul class="mt-2 space-y-1">
          <li v-for="permissao in dados.permissoes" :key="permissao.codigo" class="text-sm text-surface-700">
            <span class="font-medium">{{ nomes[permissao.codigo] ?? permissao.codigo }}:</span> {{ permissao.descricao }}
          </li>
        </ul>
      </section>

      <input
        v-model="busca"
        type="text"
        placeholder="Buscar usuário"
        class="w-full rounded-xl border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />

      <p v-if="erro" class="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>

      <section class="overflow-hidden rounded-2xl border border-surface-200">
        <table class="w-full text-sm">
          <thead class="bg-surface-100 text-left text-xs text-surface-500">
            <tr>
              <th class="px-4 py-2 font-medium">Usuário</th>
              <th v-for="permissao in dados.permissoes" :key="permissao.codigo" class="px-3 py-2 text-center font-medium">
                {{ nomes[permissao.codigo] ?? permissao.codigo }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="usuario in usuariosFiltrados" :key="usuario.id" class="border-t border-surface-200">
              <td class="px-4 py-2">
                <span class="block text-surface-800">{{ usuario.nome }}<span v-if="usuario.id === auth.user?.id" class="text-surface-500"> (você)</span></span>
                <span class="block text-xs text-surface-500">{{ usuario.login }}</span>
              </td>
              <td v-for="permissao in dados.permissoes" :key="permissao.codigo" class="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-primary-600"
                  :checked="usuario.permissoes.includes(permissao.codigo)"
                  :disabled="alterando === chave(usuario.id, permissao.codigo)"
                  :aria-label="`${nomes[permissao.codigo] ?? permissao.codigo} para ${usuario.nome}`"
                  @change="alternar(usuario, permissao.codigo, $event.target as HTMLInputElement)"
                />
              </td>
            </tr>
          </tbody>
        </table>
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

const auth = useAuthStore()

const nomes: Record<string, string> = {
  [CodigoPermissao.Parametros]: 'Sistema',
  [CodigoPermissao.Permissoes]: 'Acessos',
}

const dados = ref<PermissoesSistema | null>(null)
const carregando = ref(true)
const erro = ref('')
const busca = ref('')
const alterando = ref('')

const chave = (usuarioId: number, codigo: string) => `${usuarioId}:${codigo}`

const usuariosFiltrados = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  const usuarios = dados.value?.usuarios ?? []
  return termo ? usuarios.filter((u) => u.nome.toLowerCase().includes(termo) || u.login.toLowerCase().includes(termo)) : usuarios
})

onMounted(async () => {
  try {
    dados.value = await api.getPermissoes()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao carregar as permissões'
  } finally {
    carregando.value = false
  }
})

async function alternar(usuario: PermissoesSistema['usuarios'][number], codigo: string, caixa: HTMLInputElement) {
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
