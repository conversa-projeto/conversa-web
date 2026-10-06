<template>
  <div class="space-y-4">
    <p v-if="carregando" class="text-sm text-surface-500">Carregando...</p>
    <p v-else-if="!form" class="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>

    <form v-else class="space-y-4" @submit.prevent="salvar">
      <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
        Valem para todos os usuários e entram em vigor ao salvar, sem reiniciar o servidor.
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
            <input v-model="form.turn_forcar_relay" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600" />
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

      <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
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
import type { AlteracaoParametros, ParametrosSistema } from '../types/api'

const CAMPO = 'mt-1 block rounded-xl border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100'

const original = ref<ParametrosSistema | null>(null)
const form = ref<ParametrosSistema | null>(null)
const novaChave = ref('')
const carregando = ref(true)
const salvando = ref(false)
const salvo = ref(false)
const erro = ref('')

const chaveConfigurada = computed(() => !!original.value?.fcm_private_key_configurada)

const CAMPOS = ['fcm_project_id', 'fcm_client_email', 'turn_forcar_relay', 'transcritor_url', 'transcritor_idioma', 'gravacao_dias'] as const

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
  return mudancas
})

const alterado = computed(() => Object.keys(alteracao.value).length > 0)

function aplicar(parametros: ParametrosSistema) {
  original.value = parametros
  form.value = { ...parametros }
  novaChave.value = ''
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

async function salvar() {
  if (!alterado.value) return
  salvando.value = true
  salvo.value = false
  erro.value = ''
  try {
    aplicar(await api.alterarParametros(alteracao.value))
    salvo.value = true
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao salvar as configurações'
  } finally {
    salvando.value = false
  }
}
</script>
