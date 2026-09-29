<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[130] flex flex-col bg-black/85" @click.self="emit('fechar')">
      <div class="flex shrink-0 items-center gap-2 bg-chamada-900 px-3 py-2 text-sm text-white">
        <span class="min-w-0 flex-1 truncate font-medium" :title="nome">{{ nome }}</span>
        <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-chamada-700" title="Baixar" @click="emit('baixar')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
        </button>
        <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-chamada-700" title="Fechar (Esc)" @click="emit('fechar')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <p v-if="erro" class="mt-10 text-center text-sm text-white/80">{{ erro }}</p>
      <p v-else-if="html === null" class="mt-10 text-center text-sm text-white/80">Carregando HTML...</p>
      <!-- sandbox sem allow-same-origin: a página roda numa origem isolada, sem
           acesso ao token de login, aos cookies nem à janela do app -->
      <iframe
        v-else
        :srcdoc="html"
        sandbox="allow-scripts"
        referrerpolicy="no-referrer"
        class="min-h-0 w-full flex-1 border-0 bg-white"
        :title="nome"
      ></iframe>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getAnexoUrl } from '../services/conversaApi'

const props = defineProps<{
  identificador: string
  nome: string
}>()

const emit = defineEmits<{
  fechar: []
  baixar: []
}>()

const html = ref<string | null>(null)
const erro = ref('')

function aoTeclar(evento: KeyboardEvent) {
  if (evento.key === 'Escape') emit('fechar')
}

onMounted(async () => {
  window.addEventListener('keydown', aoTeclar)
  try {
    const resposta = await fetch(await getAnexoUrl(props.identificador))
    if (!resposta.ok) throw new Error()
    html.value = await resposta.text()
  } catch {
    erro.value = 'Não foi possível abrir o HTML. Tente baixar o arquivo.'
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', aoTeclar)
})
</script>
