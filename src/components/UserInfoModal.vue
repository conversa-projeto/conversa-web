<template>
  <div
    v-if="aberta && usuario"
    class="fixed inset-0 z-[120] flex items-center justify-center bg-surface-950/45 px-4 py-6"
    @click.self="emit('close')"
  >
    <div class="relative w-full max-w-[260px] rounded-3xl bg-surface-base shadow-2xl">
      <button
        type="button"
        class="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-surface-400 transition hover:bg-surface-100 hover:text-surface-700"
        title="Fechar"
        @click="emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>

      <div class="flex flex-col items-center px-5 pb-5 pt-8 text-center">
        <div class="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-5xl font-semibold text-primary-700 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
          <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar do usuario" class="h-full w-full object-cover" @error="ocultarAvatar = true" />
          <span v-else>{{ inicialUsuario }}</span>
        </div>
        <h2 class="mt-3 text-lg font-semibold text-surface-900">{{ usuario.nome }}</h2>
      </div>

      <div class="px-5 pb-5">
        <div class="divide-y divide-surface-200 rounded-xl border border-surface-200">
          <div class="px-4 py-2.5">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Email</p>
            <p class="mt-0.5 text-sm text-surface-800">{{ usuario.email || 'Nao informado' }}</p>
          </div>
          <div class="px-4 py-2.5">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Telefone</p>
            <p class="mt-0.5 text-sm text-surface-800">{{ usuario.telefone || 'Nao informado' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { UsuarioPopup } from '../utils/userProfile'

const props = defineProps<{
  aberta: boolean
  usuario: UsuarioPopup | null
}>()

const emit = defineEmits<{
  close: []
}>()

const ocultarAvatar = ref(false)

const avatarUrl = computed(() => {
  if (ocultarAvatar.value) return ''
  return props.usuario?.avatar_url || ''
})

const inicialUsuario = computed(() => {
  const nome = props.usuario?.nome?.trim() || 'U'
  return (nome.charAt(0) || 'U').toUpperCase()
})

watch(() => props.usuario?.avatar_url, () => {
  ocultarAvatar.value = false
}, { immediate: true })
</script>
