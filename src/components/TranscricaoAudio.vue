<template>
  <div class="mt-1 text-xs">
    <p v-if="status === StatusTranscricao.Concluida" class="whitespace-pre-wrap break-words opacity-90">
      {{ texto || '(nenhuma fala reconhecida)' }}
    </p>
    <span v-else-if="status === StatusTranscricao.Processando" class="flex items-center gap-1.5 opacity-80">
      <svg class="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      Transcrevendo...
    </span>
    <button
      v-else
      type="button"
      class="underline decoration-dotted underline-offset-2 opacity-80 transition hover:opacity-100 disabled:opacity-50"
      :disabled="enviando"
      @click="transcrever"
    >
      {{ status === StatusTranscricao.Erro ? 'Não foi possível transcrever. Tentar de novo' : 'Transcrever' }}
    </button>
    <p v-if="mensagemErro" class="mt-0.5 opacity-70">{{ mensagemErro }}</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getTranscricao, transcreverAudio } from '../services/conversaApi'
import { StatusTranscricao, type TranscricaoAudio } from '../types/api'

const props = defineProps<{
  identificador: string
  statusInicial?: number
  textoInicial?: string
}>()

const INTERVALO_CONSULTA_MS = 3000

const status = ref<number>(props.statusInicial ?? StatusTranscricao.Nenhuma)
const texto = ref(props.textoInicial ?? '')
const mensagemErro = ref('')
const enviando = ref(false)
let consulta: number | null = null

function pararConsulta() {
  if (consulta !== null) {
    window.clearInterval(consulta)
    consulta = null
  }
}

// Enquanto o servidor processa, pergunta de tempos em tempos pelo resultado.
function acompanhar() {
  if (consulta !== null) return
  consulta = window.setInterval(async () => {
    try {
      aplicar(await getTranscricao(props.identificador))
    } catch {
      // tenta de novo no proximo intervalo
    }
  }, INTERVALO_CONSULTA_MS)
}

function aplicar(resultado: TranscricaoAudio) {
  status.value = resultado.status
  texto.value = resultado.texto
  mensagemErro.value = resultado.status === StatusTranscricao.Erro ? resultado.erro : ''
  if (resultado.status === StatusTranscricao.Processando) {
    acompanhar()
  } else {
    pararConsulta()
  }
}

async function transcrever() {
  enviando.value = true
  mensagemErro.value = ''
  try {
    aplicar(await transcreverAudio(props.identificador))
  } catch (e) {
    mensagemErro.value = e instanceof Error ? e.message : 'Erro ao transcrever'
  } finally {
    enviando.value = false
  }
}

onMounted(() => {
  if (status.value === StatusTranscricao.Processando) acompanhar()
})

onBeforeUnmount(pararConsulta)
</script>
