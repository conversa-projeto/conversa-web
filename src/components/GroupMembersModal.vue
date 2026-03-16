<template>
  <div v-if="aberta" class="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4">
    <div class="w-full max-w-md rounded-xl bg-white p-4">
      <h3 class="mb-3 text-lg font-semibold text-slate-800">Membros do grupo</h3>

      <div class="rounded border border-slate-200 bg-slate-50 p-3">
        <p class="mb-2 text-sm font-medium text-slate-700">Nome do grupo</p>
        <div class="flex gap-2">
          <input
            v-model.trim="nomeGrupo"
            type="text"
            class="flex-1 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="Digite o nome do grupo"
          />
          <button
            class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            :disabled="!podeRenomear"
            @click="renomear"
          >
            {{ renomeando ? 'Salvando...' : 'Renomear' }}
          </button>
        </div>
      </div>

      <div class="mt-4 max-h-52 overflow-auto rounded border border-slate-200">
        <div
          v-for="membro in chat.usuariosConversaAtiva"
          :key="`membro-${membro.usuario_id}`"
          class="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm"
        >
          <span class="text-slate-700">{{ membro.nome }}</span>
          <button
            v-if="membro.usuario_id !== auth.user?.id"
            class="rounded px-2 py-0.5 text-xs text-rose-600 hover:bg-rose-50"
            :disabled="removendo === membro.id"
            @click="remover(membro)"
          >
            {{ removendo === membro.id ? 'Removendo...' : 'Remover' }}
          </button>
        </div>
        <p v-if="!chat.usuariosConversaAtiva.length" class="px-3 py-4 text-center text-sm text-slate-400">
          Nenhum membro
        </p>
      </div>

      <div class="mt-3">
        <p class="mb-2 text-sm font-medium text-slate-700">Adicionar participante</p>
        <div class="flex gap-2">
          <select
            v-model="usuarioSelecionado"
            class="flex-1 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option :value="null" disabled>Selecionar usuario</option>
            <option
              v-for="contato in contatosDisponiveis"
              :key="`add-${contato.id}`"
              :value="contato.id"
            >
              {{ contato.nome }}
            </option>
          </select>
          <button
            class="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            :disabled="!usuarioSelecionado || adicionando"
            @click="adicionar"
          >
            {{ adicionando ? 'Adicionando...' : 'Adicionar' }}
          </button>
        </div>
      </div>

      <p v-if="erro" class="mt-2 rounded bg-rose-50 px-2 py-1 text-sm text-rose-700">{{ erro }}</p>
      <p v-if="sucesso" class="mt-2 rounded bg-emerald-50 px-2 py-1 text-sm text-emerald-700">{{ sucesso }}</p>

      <div class="mt-4 flex justify-end">
        <button class="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100" @click="emit('close')">Fechar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { useAuthStore } from '../stores/auth'
import type { Contato } from '../types/api'

defineProps<{
  aberta: boolean
}>()

const emit = defineEmits<{
  'close': []
}>()

const chat = useChatStore()
const auth = useAuthStore()

const usuarioSelecionado = ref<number | null>(null)
const nomeGrupo = ref('')
const adicionando = ref(false)
const renomeando = ref(false)
const removendo = ref<number | null>(null)
const erro = ref('')
const sucesso = ref('')

const contatosDisponiveis = computed(() => {
  const idsAtuais = new Set(chat.usuariosConversaAtiva.map((u: { usuario_id: number }) => u.usuario_id))
  return chat.contatos.filter((c: Contato) => !idsAtuais.has(c.id))
})

const podeRenomear = computed(() => {
  const nomeAtual = (chat.conversaAtiva?.descricao || '').trim()
  const novoNome = nomeGrupo.value.trim()
  return Boolean(chat.conversaAtiva && novoNome && novoNome !== nomeAtual && !renomeando.value)
})

watch(() => chat.conversaAtiva, (conversa) => {
  nomeGrupo.value = conversa?.descricao || ''
  erro.value = ''
  sucesso.value = ''
  usuarioSelecionado.value = null
  if (conversa) {
    void chat.carregarUsuariosConversa(conversa.id, true)
  }
}, { immediate: true })

async function renomear() {
  if (!chat.conversaAtiva || !podeRenomear.value) return
  erro.value = ''
  sucesso.value = ''
  renomeando.value = true
  try {
    await chat.renomearGrupo(chat.conversaAtiva.id, nomeGrupo.value.trim())
    nomeGrupo.value = chat.conversaAtiva?.descricao || nomeGrupo.value.trim()
    sucesso.value = 'Grupo renomeado com sucesso.'
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao renomear o grupo'
  } finally {
    renomeando.value = false
  }
}

async function adicionar() {
  if (!usuarioSelecionado.value || !chat.conversaAtiva) return
  erro.value = ''
  sucesso.value = ''
  adicionando.value = true
  try {
    await chat.adicionarMembroGrupo(chat.conversaAtiva.id, usuarioSelecionado.value)
    usuarioSelecionado.value = null
    sucesso.value = 'Participante adicionado com sucesso.'
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao adicionar'
  } finally {
    adicionando.value = false
  }
}

async function remover(membro: { id: number; usuario_id: number; nome: string }) {
  if (!chat.conversaAtiva) return
  erro.value = ''
  sucesso.value = ''
  removendo.value = membro.id
  try {
    await chat.removerMembroGrupo(chat.conversaAtiva.id, membro.id)
    sucesso.value = 'Participante removido com sucesso.'
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao remover'
  } finally {
    removendo.value = null
  }
}
</script>
