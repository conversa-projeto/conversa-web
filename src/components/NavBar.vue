<template>
  <!-- Desktop: barra vertical à esquerda -->
  <nav class="hidden w-[60px] shrink-0 flex-col items-center justify-between border-r border-surface-300 bg-surface-200 pb-2 md:flex">
    <div class="flex w-full flex-col items-center">
      <!-- Avatar do usuário -->
      <button
        class="relative flex w-full flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] transition"
        :class="secaoAtiva === 'config'
          ? 'bg-surface-50 text-primary-500'
          : 'text-surface-500 hover:bg-surface-300 hover:text-surface-700'"
        title="Configurações"
        @click="emit('update:secaoAtiva', 'config')"
      >
        <span
          v-if="secaoAtiva === 'config'"
          class="absolute inset-y-0 left-0 w-px bg-primary-500"
        />
        <span class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-base font-semibold text-primary-700">
          <img v-if="avatarUrl" :src="avatarUrl" alt="Perfil" class="h-full w-full object-cover" @error="emit('avatar-error')" />
          <span v-else>{{ inicialUsuario }}</span>
        </span>
      </button>

      <button
        v-for="item in itensVisiveis"
        :key="item.id"
        class="relative flex w-full flex-col items-center gap-0.5 px-1 py-[7.5px] text-[10px] transition"
        :class="secaoAtiva === item.id
          ? 'bg-surface-50 text-primary-500'
          : 'text-surface-500 hover:bg-surface-300 hover:text-surface-700'"
        @click="onItemClick(item.id)"
      >
        <span
          v-if="secaoAtiva === item.id"
          class="absolute inset-y-0 left-0 w-px bg-primary-500"
        />
        <span class="relative">
          <component :is="item.icone" class="h-5 w-5" />
          <span
            v-if="item.id === 'ramal' && sipStatus !== 'desconectado'"
            class="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface-200"
            :class="{
              'bg-success-500': sipStatus === 'conectado',
              'bg-warning-400': sipStatus === 'conectando',
              'bg-danger-500': sipStatus === 'erro',
            }"
          />
        </span>
        <span>{{ item.label }}</span>
      </button>
    </div>
  </nav>

  <!-- Mobile: barra horizontal no rodapé -->
  <nav class="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-surface-300 bg-surface-200 md:hidden">
    <!-- Avatar do usuário -->
    <button
      class="relative flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-[10px] transition"
      :class="secaoAtiva === 'config'
        ? 'bg-surface-50 text-primary-500'
        : 'text-surface-500 hover:text-surface-700'"
      @click="emit('update:secaoAtiva', 'config')"
    >
      <span
        v-if="secaoAtiva === 'config'"
        class="absolute bottom-0 inset-x-0 h-px bg-primary-500"
      />
      <span class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
        <img v-if="avatarUrl" :src="avatarUrl" alt="Perfil" class="h-full w-full object-cover" @error="emit('avatar-error')" />
        <span v-else>{{ inicialUsuario }}</span>
      </span>
    </button>

    <button
      v-for="item in itensVisiveis"
      :key="item.id"
      class="relative flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-[10px] transition"
      :class="secaoAtiva === item.id
        ? 'bg-surface-50 text-primary-500'
        : 'text-surface-500 hover:text-surface-700'"
      @click="onItemClick(item.id)"
    >
      <span
        v-if="secaoAtiva === item.id"
        class="absolute bottom-0 inset-x-0 h-px bg-primary-500"
      />
      <span class="relative">
        <component :is="item.icone" class="h-5 w-5" />
        <span
          v-if="item.id === 'ramal' && sipStatus !== 'desconectado'"
          class="absolute -right-1 -top-1 h-2 w-2 rounded-full border border-surface-200"
          :class="{
            'bg-success-500': sipStatus === 'conectado',
            'bg-warning-400': sipStatus === 'conectando',
            'bg-danger-500': sipStatus === 'erro',
          }"
        />
      </span>
      <span>{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'

const props = defineProps<{
  secaoAtiva: string
  avatarUrl: string
  inicialUsuario: string
  sipDisponivel: boolean
  sipStatus: 'conectado' | 'conectando' | 'erro' | 'desconectado'
}>()

const emit = defineEmits<{
  'update:secaoAtiva': [secao: string]
  'avatar-error': []
  'open-dialer': []
}>()

function onItemClick(id: string) {
  if (id === 'ramal') {
    emit('open-dialer')
  } else {
    emit('update:secaoAtiva', id)
  }
}

const itensVisiveis = computed(() =>
  itensPrincipais.filter(item => item.id !== 'ramal' || props.sipDisponivel)
)

const IconeChat = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24', 'stroke-width': '1.5', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z' })
])

const IconeAtividades = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24', 'stroke-width': '1.5', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0' })
])

const IconeEquipes = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24', 'stroke-width': '1.5', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z' })
])

const IconeChamadas = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24', 'stroke-width': '1.5', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z' })
])

const IconeRamal = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24', 'stroke-width': '1.5', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z' }),
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z' })
])

const itensPrincipais = [
  { id: 'chat', label: 'Chat', icone: IconeChat },
  { id: 'atividades', label: 'Atividades', icone: IconeAtividades },
  { id: 'equipes', label: 'Equipes', icone: IconeEquipes },
  { id: 'chamadas', label: 'Chamadas', icone: IconeChamadas },
  { id: 'ramal', label: 'Ramal', icone: IconeRamal },
]
</script>
