<template>
  <div class="space-y-4">
    <p v-if="carregando" class="text-sm text-surface-500">Carregando...</p>
    <template v-else>
      <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
        <h4 class="text-sm font-semibold text-surface-800">Status</h4>
        <p class="mt-1 text-xs text-surface-500">
          Os contatos veem você ativo com o Conversa aberto e em uso, ausente quando ele está escondido ou parado há 5 minutos.
          Valem para todos os seus aparelhos e mudam na hora.
        </p>
        <div class="mt-3 space-y-3">
          <label v-for="opcao in OPCOES" :key="opcao.chave" class="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
              :checked="privacidade[opcao.chave]"
              :disabled="salvando || (opcao.chave !== 'aparecer_offline' && privacidade.aparecer_offline)"
              @change="alterar(opcao.chave, ($event.target as HTMLInputElement).checked)"
            />
            <span class="min-w-0">
              <span class="block text-sm text-surface-800">{{ opcao.titulo }}</span>
              <span class="block text-xs text-surface-500">{{ opcao.descricao }}</span>
            </span>
          </label>
        </div>
      </section>
    </template>

    <section v-if="sugestoes.disponivel.value" class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
      <h4 class="text-sm font-semibold text-surface-800">Inteligência artificial</h4>
      <label class="mt-3 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
          :checked="sugestoes.ligadas.value"
          @change="sugestoes.alterar(($event.target as HTMLInputElement).checked)"
        />
        <span class="min-w-0">
          <span class="block text-sm text-surface-800">Sugerir a continuação ao digitar</span>
          <span class="block text-xs text-surface-500">
            Depois de uma pausa, a IA sugere em cinza como continuar a mensagem: Tab aceita, Esc descarta.
            Para isso, o que você digita e as últimas mensagens da conversa vão para o servidor de IA do sistema.
            Vale só neste navegador.
          </span>
        </span>
      </label>
    </section>
    <p v-if="erro" class="rounded bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as api from '../services/conversaApi'
import { useAuthStore } from '../stores/auth'
import { usePreferenciaSugestoes } from '../composables/useSugestaoIa'
import type { Privacidade } from '../types/api'

const OPCOES: Array<{ chave: keyof Privacidade; titulo: string; descricao: string }> = [
  { chave: 'aparecer_offline', titulo: 'Aparecer offline', descricao: 'Para os outros você fica offline, sem visto por último nem a conversa aberta.' },
  { chave: 'mostrar_visto_em', titulo: 'Mostrar o visto por último', descricao: 'Quando você esteve ativo pela última vez, para quem tem conversa com você.' },
  { chave: 'mostrar_na_conversa', titulo: 'Mostrar quando estou na conversa', descricao: 'Quem está na conversa vê que você está com ela aberta.' },
]

const auth = useAuthStore()
const sugestoes = usePreferenciaSugestoes()
const privacidade = ref<Privacidade>({ mostrar_visto_em: true, mostrar_na_conversa: true, aparecer_offline: false })
const carregando = ref(true)
const salvando = ref(false)
const erro = ref('')

onMounted(async () => {
  try {
    privacidade.value = await api.getPrivacidade()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao carregar a privacidade'
  } finally {
    carregando.value = false
  }
})

async function alterar(chave: keyof Privacidade, valor: boolean) {
  if (!auth.user) return
  const anterior = privacidade.value
  privacidade.value = { ...anterior, [chave]: valor }
  salvando.value = true
  erro.value = ''
  try {
    await api.atualizarUsuario(auth.user.id, { [chave]: valor })
  } catch (e) {
    privacidade.value = anterior
    erro.value = e instanceof Error ? e.message : 'Erro ao salvar a privacidade'
  } finally {
    salvando.value = false
  }
}
</script>
