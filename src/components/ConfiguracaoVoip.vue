<template>
  <div class="space-y-4">
    <section class="rounded-2xl border border-surface-200 p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h4 class="text-sm font-semibold text-surface-800">Ramal SIP</h4>
          <p class="mt-1 text-sm text-surface-500">Configurado pelo administrador, em Pessoas › Usuários.</p>
        </div>
        <span class="flex items-center gap-2 whitespace-nowrap rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-surface-700">
          <span class="h-2 w-2 rounded-full" :class="corStatus" />
          {{ textoStatus }}
        </span>
      </div>

      <p v-if="sip.carregandoConfig" class="mt-4 text-sm text-surface-500">Carregando...</p>

      <p v-else-if="!sip.sipConfig" class="mt-4 rounded-xl bg-surface-100 px-3 py-2 text-sm text-surface-600">
        Você ainda não tem um ramal. Peça ao administrador para configurar.
      </p>

      <template v-else>
        <dl class="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt class="text-xs text-surface-500">Ramal</dt>
            <dd class="text-surface-800">{{ sip.sipConfig.sip_user }}</dd>
          </div>
          <div>
            <dt class="text-xs text-surface-500">Nome de exibição</dt>
            <dd class="text-surface-800">{{ sip.sipConfig.display_name || sip.sipConfig.sip_user }}</dd>
          </div>
          <div>
            <dt class="text-xs text-surface-500">Domínio</dt>
            <dd class="break-all text-surface-800">{{ sip.sipConfig.domain }}</dd>
          </div>
          <div>
            <dt class="text-xs text-surface-500">Servidor WebSocket</dt>
            <dd class="break-all text-surface-800">{{ sip.sipConfig.ws_server }}</dd>
          </div>
          <div class="md:col-span-2">
            <dt class="text-xs text-surface-500">Mídia</dt>
            <dd class="text-surface-800">{{ sip.sipConfig.turn_server ? `STUN e TURN (${sip.sipConfig.turn_server})` : 'Somente STUN' }}</dd>
          </div>
        </dl>

        <p v-if="sip.erro" class="mt-4 rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ sip.erro }}</p>

        <div v-if="sip.sipDisponivel" class="mt-4 flex justify-end">
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            :disabled="sip.processandoConexao"
            @click="reconectar"
          >
            {{ sip.processandoConexao ? 'Conectando...' : 'Reconectar' }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSipStore } from '../stores/sip'

const sip = useSipStore()

const textoStatus = computed(() => {
  if (!sip.sipConfig) return 'Sem ramal'
  if (!sip.sipDisponivel) return 'Desativado'
  if (sip.isRegistered) return 'Registrado'
  if (sip.isConnecting || sip.processandoConexao) return 'Conectando'
  return 'Não registrado'
})

const corStatus = computed(() => {
  if (sip.isRegistered) return 'bg-success-500'
  if (sip.isConnecting || sip.processandoConexao) return 'bg-warning-400'
  if (sip.sipDisponivel) return 'bg-danger-500'
  return 'bg-surface-300'
})

onMounted(() => {
  if (!sip.sipConfig) void sip.carregarConfiguracao()
})

function reconectar() {
  void sip.inicializarSessao(true)
}
</script>
