<template>
  <div class="min-w-0 mb-1 last:mb-0">
    <template v-if="ehTipo(conteudo.tipo, TipoConteudo.Texto)">
      <template v-if="temCodigoFormatado(conteudo.conteudo)">
        <template v-for="(seg, segIdx) in parseCodeBlocks(conteudo.conteudo)" :key="segIdx">
          <p
            v-if="seg.tipo === 'texto' && seg.conteudo.trim()"
            class="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed"
          >
            <template v-for="(linkSeg, linkIdx) in parseLinks(seg.conteudo)" :key="linkIdx">
              <template v-if="linkSeg.tipo === 'texto'">{{ linkSeg.conteudo }}</template>
              <a
                v-else
                :href="formatarUrl(linkSeg.conteudo)"
                target="_blank"
                rel="noopener noreferrer"
                :class="isOwn ? 'text-white underline' : 'text-primary-500 hover:underline'"
              >{{ linkSeg.conteudo }}</a>
            </template>
          </p>
          <div v-else-if="seg.tipo === 'codigo'" class="group relative mb-1 last:mb-0 max-w-full">
            <div class="flex items-center justify-between bg-surface-200 px-3 py-1" :class="codigoSemBorda ? 'rounded-t-[10px]' : 'rounded-t'">
              <span class="text-[10px] text-surface-500">{{ seg.linguagem || 'code' }}</span>
              <button
                class="text-[10px] transition-opacity"
                :class="codigosCopiados.has(`${mensagemId}-${segIdx}`) ? 'text-success-600' : 'text-surface-500 opacity-0 group-hover:opacity-100 hover:text-surface-800'"
                @click="copiarCodigo(seg.conteudo, `${mensagemId}-${segIdx}`)"
              >{{ codigosCopiados.has(`${mensagemId}-${segIdx}`) ? 'Copiado!' : 'Copiar' }}</button>
            </div>
            <pre class="overflow-x-auto bg-surface-50 p-3 text-xs leading-relaxed text-surface-800" :class="codigoSemBorda ? '' : 'rounded-b border border-surface-200'"><code v-html="highlightCodigo(seg.conteudo, seg.linguagem)"></code></pre>
          </div>
        </template>
      </template>
      <p
        v-else
        class="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed"
      >
        <template v-for="(linkSeg, linkIdx) in parseLinks(conteudo.conteudo)" :key="linkIdx">
          <template v-if="linkSeg.tipo === 'texto'">{{ linkSeg.conteudo }}</template>
          <a
            v-else
            :href="formatarUrl(linkSeg.conteudo)"
            target="_blank"
            rel="noopener noreferrer"
            :class="isOwn ? 'text-white underline' : 'text-primary-500 hover:underline'"
          >{{ linkSeg.conteudo }}</a>
        </template>
      </p>
    </template>

    <img
      v-else-if="ehTipo(conteudo.tipo, TipoConteudo.Imagem)"
      :src="conteudo.localUrl || getAnexoUrl(conteudo.conteudo)"
      alt="Imagem"
      class="max-h-64 cursor-zoom-in rounded border-2"
      :class="isOwn ? 'border-primary-600 dark:border-primary-800' : 'border-surface-base'"
      decoding="async"
      @load="emit('image-loaded')"
      @click="emit('open-image', conteudo.conteudo, conteudo.nome || 'Imagem')"
    />

    <template v-else-if="ehTipo(conteudo.tipo, TipoConteudo.Arquivo)">
      <template v-if="isVideoConteudo(conteudo)">
        <div class="w-[420px] max-w-full">
          <video
            controls
            preload="metadata"
            :src="conteudo.localUrl || getAnexoUrl(conteudo.conteudo)"
            class="h-[236px] w-full rounded border border-surface-200 bg-black object-contain"
          />
        </div>
        <button
          v-if="!conteudo.localUrl"
          class="mt-1 flex items-center gap-1 text-xs underline"
          @click.prevent="emit('download', conteudo.conteudo, conteudo.nome || 'video')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Baixar video
        </button>
      </template>
      <div v-else class="flex items-center gap-2 rounded border px-2 py-2" :class="isOwn ? 'border-white/20 bg-white/10 text-white' : 'border-surface-200 bg-surface-50 text-surface-800'">
        <div class="min-w-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="mx-auto h-7 w-7" :class="isOwn ? 'text-white/70' : 'text-surface-500'"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
          <div class="mt-1 max-w-28 truncate text-[11px]" :title="conteudo.nome || 'Arquivo'">
            {{ conteudo.nome || 'Arquivo' }}
          </div>
        </div>
        <button
          v-if="!conteudo.localUrl"
          class="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-white"
          :class="isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-primary-600 hover:bg-primary-700'"
          @click.prevent="emit('download', conteudo.conteudo, conteudo.nome || 'Arquivo')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Download
        </button>
      </div>
    </template>
    <AudioPlayerArquivo
      v-else-if="ehTipo(conteudo.tipo, TipoConteudo.Audio)"
      :src="conteudo.localUrl"
      :identificador="conteudo.conteudo"
      :conversa-id="conversaId"
      :mensagem-id="mensagemId"
      :reproduzida="reproduzida"
      :nome="conteudo.nome || 'Audio'"
      :is-own="isOwn"
    >
      <template #status><slot name="audio-status" /></template>
    </AudioPlayerArquivo>
    <AudioPlayerGravacao
      v-else-if="ehTipo(conteudo.tipo, TipoConteudo.GravacaoAudio)"
      :src="conteudo.localUrl"
      :identificador="conteudo.conteudo"
      :conversa-id="conversaId"
      :mensagem-id="mensagemId"
      :reproduzida="reproduzida"
      :is-own="isOwn"
    >
      <template #status><slot name="audio-status" /></template>
    </AudioPlayerGravacao>
  </div>
</template>

<script setup lang="ts">
import { TipoConteudo } from '../types/api'
import type { ConteudoMensagem } from '../types/api'
import { classeTextoMensagem, isVideoConteudo, parseLinks, formatarUrl } from '../utils/formatters'
import { useCodeHighlight } from '../composables/useCodeHighlight'
import AudioPlayerArquivo from './AudioPlayerArquivo.vue'
import AudioPlayerGravacao from './AudioPlayerGravacao.vue'

defineProps<{
  conteudo: ConteudoMensagem
  mensagemId: number
  conversaId?: number
  reproduzida?: boolean
  isOwn?: boolean
  codigoSemBorda?: boolean
  getAnexoUrl: (identificador: string) => string
}>()

const emit = defineEmits<{
  'open-image': [identificador: string, nome: string]
  'image-loaded': []
  'download': [identificador: string, nome: string]
}>()

const { codigosCopiados, copiarCodigo, temCodigoFormatado, parseCodeBlocks, highlightCodigo } = useCodeHighlight()

function ehTipo(valor: number | string, tipo: number) {
  return Number(valor) === tipo
}
</script>