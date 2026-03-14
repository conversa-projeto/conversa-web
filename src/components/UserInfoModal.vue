<template>
  <div
    v-if="aberta && usuario"
    class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4 py-6"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
      <div class="flex justify-end">
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          title="Fechar"
          @click="emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="-mt-2 flex flex-col items-center text-center">
        <div class="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-3xl font-semibold text-blue-700 shadow-inner">
          <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar do usuario" class="h-full w-full object-cover" @error="ocultarAvatar = true" />
          <span v-else>{{ inicialUsuario }}</span>
        </div>
        <h2 class="mt-4 text-xl font-semibold text-slate-900">{{ usuario.nome }}</h2>
      </div>

      <div class="mt-6 space-y-3">
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</p>
          <p class="mt-1 text-sm text-slate-800">{{ usuario.email || 'Nao informado' }}</p>
        </div>
        <div class="rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Telefone</p>
          <p class="mt-1 text-sm text-slate-800">{{ usuario.telefone || 'Nao informado' }}</p>
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
