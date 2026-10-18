<template>
  <div class="space-y-3">
    <p v-if="carregando" class="text-sm text-surface-500">Carregando...</p>

    <form v-else class="grid gap-3 sm:grid-cols-2" @submit.prevent="salvar">
      <label class="block text-sm text-surface-700">
        Ramal
        <input v-model.trim="form.sip_user" type="text" placeholder="1001" :class="campo" />
      </label>
      <label class="block text-sm text-surface-700">
        Senha do ramal
        <input v-model="form.sip_password" type="password" autocomplete="new-password" :placeholder="temSenha ? 'Salva (vazio mantém)' : 'Senha do ramal'" :class="campo" />
      </label>
      <label class="block text-sm text-surface-700">
        Domínio SIP
        <input v-model.trim="form.domain" type="text" placeholder="voip.empresa.com" :class="campo" />
      </label>
      <label class="block text-sm text-surface-700">
        Servidor WebSocket
        <input v-model.trim="form.ws_server" type="text" placeholder="wss://voip.empresa.com:8089/ws" :class="campo" />
      </label>
      <label class="block text-sm text-surface-700">
        Usuário de autenticação
        <input v-model.trim="form.auth_user" type="text" :placeholder="form.sip_user || 'O mesmo do ramal'" :class="campo" />
      </label>
      <label class="block text-sm text-surface-700">
        Nome de exibição
        <input v-model.trim="form.display_name" type="text" :placeholder="props.usuario.nome" :class="campo" />
      </label>

      <fieldset class="rounded-xl border border-surface-200 p-3 sm:col-span-2">
        <legend class="px-1 text-xs font-semibold uppercase tracking-wide text-surface-500">TURN do PABX (opcional; vazio = somente STUN)</legend>
        <div class="grid gap-3 sm:grid-cols-3">
          <label class="block text-sm text-surface-700">
            Servidor
            <input v-model.trim="form.turn_server" type="text" placeholder="turns:voip.empresa.com:443" :class="campo" />
          </label>
          <label class="block text-sm text-surface-700">
            Usuário
            <input v-model.trim="form.turn_user" type="text" :disabled="!form.turn_server" :class="campo" />
          </label>
          <label class="block text-sm text-surface-700">
            Senha
            <input v-model="form.turn_password" type="password" autocomplete="new-password" :disabled="!form.turn_server" :placeholder="temSenhaTurn ? 'Salva (vazio mantém)' : ''" :class="campo" />
          </label>
        </div>
      </fieldset>

      <label class="flex items-center gap-2 text-sm text-surface-700 sm:col-span-2">
        <input v-model="form.ativo" type="checkbox" class="h-4 w-4 accent-primary-600 dark:accent-primary-500" />
        Ramal ativo (registra ao entrar no app)
      </label>

      <p v-if="erro" class="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400 sm:col-span-2">{{ erro }}</p>
      <p v-if="sucesso" class="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-700 dark:bg-success-900 dark:text-success-400 sm:col-span-2">{{ sucesso }}</p>

      <div class="flex justify-end gap-2 sm:col-span-2">
        <button
          v-if="existe"
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-medium text-danger-600 hover:bg-danger-50 disabled:opacity-60 dark:text-danger-400 dark:hover:bg-danger-900"
          :disabled="salvando"
          @click="excluir"
        >
          Excluir ramal
        </button>
        <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60" :disabled="salvando">
          {{ salvando ? 'Salvando...' : existe ? 'Salvar ramal' : 'Criar ramal' }}
        </button>
      </div>
    </form>

    <DialogoConfirmacao :dialogo="dialogo.aberto.value" @responder="dialogo.responderDialogo" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as api from '../services/conversaApi'
import { useDialogo } from '../composables/useDialogo'
import { useAuthStore } from '../stores/auth'
import { useSipStore } from '../stores/sip'
import type { SipUsuario } from '../types/api'
import { problemaRamal } from '../utils/sip'
import DialogoConfirmacao from './DialogoConfirmacao.vue'

const props = defineProps<{ usuario: { id: number; nome: string } }>()

const auth = useAuthStore()
const sip = useSipStore()
const dialogo = useDialogo()

const campo = 'mt-1 w-full rounded-xl border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-500 disabled:opacity-50'

function vazio() {
  return { sip_user: '', sip_password: '', domain: '', ws_server: '', auth_user: '', display_name: '', turn_server: '', turn_user: '', turn_password: '', ativo: true }
}

const form = ref(vazio())
const existe = ref(false)
const temSenha = ref(false)
const temSenhaTurn = ref(false)
const carregando = ref(true)
const salvando = ref(false)
const erro = ref('')
const sucesso = ref('')

function preencher(ramal: SipUsuario | null) {
  existe.value = !!ramal
  temSenha.value = !!ramal?.tem_senha
  temSenhaTurn.value = !!ramal?.tem_senha_turn
  form.value = ramal
    ? {
        sip_user: ramal.sip_user,
        sip_password: '',
        domain: ramal.domain,
        ws_server: ramal.ws_server,
        auth_user: ramal.auth_user ?? '',
        display_name: ramal.display_name ?? '',
        turn_server: ramal.turn_server ?? '',
        turn_user: ramal.turn_user ?? '',
        turn_password: '',
        ativo: ramal.ativo,
      }
    : vazio()
}

onMounted(async () => {
  try {
    preencher(await api.getSipUsuario(props.usuario.id))
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao carregar o ramal'
  } finally {
    carregando.value = false
  }
})

// Mexeu no próprio ramal: o registro deste navegador acompanha
async function atualizarProprio() {
  if (props.usuario.id === auth.user?.id) await sip.inicializarSessao(true)
}

async function salvar() {
  erro.value = ''
  sucesso.value = ''
  const f = form.value
  const problema = problemaRamal(f, !existe.value)
  if (problema) {
    erro.value = problema
    return
  }
  salvando.value = true
  try {
    preencher(await api.salvarSipUsuario({
      usuario_id: props.usuario.id,
      sip_user: f.sip_user,
      sip_password: f.sip_password || null,
      domain: f.domain,
      ws_server: f.ws_server,
      auth_user: f.auth_user || null,
      display_name: f.display_name || null,
      turn_server: f.turn_server || null,
      turn_user: f.turn_server ? f.turn_user || null : null,
      turn_password: f.turn_server ? f.turn_password || null : null,
      ativo: f.ativo,
    }))
    sucesso.value = 'Ramal salvo.'
    await atualizarProprio()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao salvar o ramal'
  } finally {
    salvando.value = false
  }
}

async function excluir() {
  const confirmado = await dialogo.confirmar({
    titulo: `Excluir o ramal de ${props.usuario.nome}?`,
    mensagem: 'A pessoa deixa de registrar o ramal e de fazer e receber ligações pela telefonia.',
    textoConfirmar: 'Excluir',
    perigo: true,
  })
  if (!confirmado) return
  erro.value = ''
  sucesso.value = ''
  salvando.value = true
  try {
    await api.excluirSipUsuario(props.usuario.id)
    preencher(null)
    sucesso.value = 'Ramal excluído.'
    await atualizarProprio()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao excluir o ramal'
  } finally {
    salvando.value = false
  }
}
</script>
