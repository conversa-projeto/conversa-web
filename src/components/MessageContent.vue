<template>
  <div class="min-w-0 mb-1 last:mb-0">
    <template v-if="ehTipo(conteudo.tipo, TipoConteudo.Texto)">
      <template v-if="temCodigoFormatado(conteudo.conteudo)">
        <template v-for="(seg, segIdx) in parseCodeBlocks(conteudo.conteudo)" :key="segIdx">
          <p
            v-if="seg.tipo === 'texto' && seg.conteudo.trim()"
            class="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed"
          >
            <template v-for="(linkSeg, linkIdx) in parseTextSegments(seg.conteudo)" :key="linkIdx">
              <template v-if="linkSeg.tipo === 'texto'">{{ linkSeg.conteudo }}</template>
              <MencaoLink v-else-if="linkSeg.tipo === 'mencao'" :nome="linkSeg.conteudo" :usuario-id="linkSeg.usuarioId!" :is-own="isOwn" />
              <a
                v-else
                :href="formatarUrl(linkSeg.conteudo)"
                target="_blank"
                rel="noopener noreferrer"
                :class="isOwn ? 'text-primary-100 underline' : 'text-primary-500 hover:underline'"
              >{{ linkSeg.conteudo }}</a>
            </template>
          </p>
          <div v-else-if="seg.tipo === 'codigo'" class="group relative mb-1 last:mb-0 min-w-0 max-w-full overflow-hidden">
            <div class="flex items-center justify-between gap-2 bg-surface-200 px-3 py-1" :class="codigoSemBorda ? 'rounded-t-[10px]' : 'rounded-t'">
              <span class="text-[10px] text-surface-500">{{ seg.linguagem || 'code' }}</span>
              <div class="flex items-center gap-2">
                <div v-if="visualHtml.has(segIdx)" class="flex rounded bg-surface-300 p-0.5 text-[10px]">
                  <button
                    type="button"
                    class="rounded px-1.5"
                    :class="verCodigo.has(segIdx) ? 'text-surface-500 hover:text-surface-800' : 'bg-surface-50 text-surface-800'"
                    @click="verCodigo.delete(segIdx)"
                  >Visualizar</button>
                  <button
                    type="button"
                    class="rounded px-1.5"
                    :class="verCodigo.has(segIdx) ? 'bg-surface-50 text-surface-800' : 'text-surface-500 hover:text-surface-800'"
                    @click="verCodigo.add(segIdx)"
                  >Código</button>
                </div>
                <button
                  class="text-[10px] transition-opacity"
                  :class="codigosCopiados.has(`${mensagemId}-${segIdx}`) ? 'text-success-600' : 'text-surface-500 opacity-0 group-hover:opacity-100 hover:text-surface-800'"
                  @click="copiarCodigo(seg.conteudo, `${mensagemId}-${segIdx}`)"
                >{{ codigosCopiados.has(`${mensagemId}-${segIdx}`) ? 'Copiado!' : 'Copiar' }}</button>
              </div>
            </div>
            <div class="relative">
              <div
                v-if="mostrarVisual(seg, segIdx)"
                :ref="(el) => medirCodigo(el as Element | null, chaveBloco(seg, segIdx))"
                :class="[
                  CLASSES_MARKDOWN,
                  codigoSemBorda ? '' : (codigosLongos.has(chaveBloco(seg, segIdx)) ? 'border border-b-0 border-surface-200' : 'rounded-b border border-surface-200'),
                  codigosExpandidos.has(chaveBloco(seg, segIdx)) ? '' : 'max-h-60 overflow-hidden'
                ]"
                v-html="visualHtml.get(segIdx)"
              ></div>
              <pre
                v-else
                :ref="(el) => medirCodigo(el as Element | null, chaveBloco(seg, segIdx))"
                class="whitespace-pre-wrap break-words bg-surface-50 p-3 text-xs leading-relaxed text-surface-800"
                :class="[
                  codigoSemBorda ? '' : (codigosLongos.has(chaveBloco(seg, segIdx)) ? 'border border-b-0 border-surface-200' : 'rounded-b border border-surface-200'),
                  codigosExpandidos.has(chaveBloco(seg, segIdx)) ? '' : 'max-h-60 overflow-hidden'
                ]"
              ><code v-html="highlightCodigo(seg.conteudo, seg.linguagem)"></code></pre>
              <div
                v-if="codigosLongos.has(chaveBloco(seg, segIdx)) && !codigosExpandidos.has(chaveBloco(seg, segIdx))"
                class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-50 to-transparent"
              ></div>
            </div>
            <button
              v-if="codigosLongos.has(chaveBloco(seg, segIdx))"
              type="button"
              class="block w-full bg-surface-200 py-1 text-center text-[11px] font-medium text-primary-500 transition hover:bg-surface-300"
              :class="codigoSemBorda ? '' : 'rounded-b'"
              @click="alternarCodigo(chaveBloco(seg, segIdx))"
            >{{ codigosExpandidos.has(chaveBloco(seg, segIdx)) ? 'Recolher código' : 'Expandir código' }}</button>
          </div>
        </template>
      </template>
      <p
        v-else
        class="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed"
      >
        <template v-for="(linkSeg, linkIdx) in parseTextSegments(conteudo.conteudo)" :key="linkIdx">
          <template v-if="linkSeg.tipo === 'texto'">{{ linkSeg.conteudo }}</template>
          <MencaoLink v-else-if="linkSeg.tipo === 'mencao'" :nome="linkSeg.conteudo" :usuario-id="linkSeg.usuarioId!" :is-own="isOwn" />
          <a
            v-else
            :href="formatarUrl(linkSeg.conteudo)"
            target="_blank"
            rel="noopener noreferrer"
            :class="isOwn ? 'text-primary-100 underline' : 'text-primary-500 hover:underline'"
          >{{ linkSeg.conteudo }}</a>
        </template>
      </p>
    </template>

    <template v-else-if="ehTipo(conteudo.tipo, TipoConteudo.Imagem)">
      <!-- Placeholder antes de liberar -->
      <div
        v-if="deveBloquear(conteudo)"
        class="flex h-40 w-56 cursor-pointer items-center justify-center rounded border border-surface-200 bg-surface-100"
        @click="liberar(conteudo)"
      >
        <div class="flex flex-col items-center gap-2 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-8 w-8 text-surface-400">
            <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
          <span class="text-xs text-surface-500">Toque para abrir</span>
        </div>
      </div>
      <!-- Imagem carregando / carregada -->
      <div v-else class="relative inline-block overflow-hidden rounded border-2" :class="isOwn ? 'border-primary-600 dark:border-primary-700' : 'border-surface-base'" :style="!imagensCarregadas.has(conteudo.ordem) ? { minHeight: '10rem', minWidth: '14rem' } : {}">
        <img
          :src="conteudo.localUrl || getAnexoUrl(conteudo.conteudo)"
          alt="Imagem"
          class="block max-h-64"
          :class="imagensCarregadas.has(conteudo.ordem) ? 'cursor-default' : ''"
          decoding="async"
          @load="onImagemCarregada(conteudo)"
          @error="onImagemErro(conteudo)"
          @click="imagensCarregadas.has(conteudo.ordem) && emit('open-image', conteudo.conteudo, conteudo.nome || 'Imagem')"
        />
        <!-- Sombra radial no canto inferior direito para o horário (só em BolhaImagem) -->
        <div v-if="mostrarGradienteImagem" class="pointer-events-none absolute bottom-0 right-0 h-8 w-28" style="background: radial-gradient(ellipse at 100% 100%, rgba(0,0,0,0.75) 0%, transparent 70%)" />
        <!-- Overlay de carregamento sobre a imagem parcial -->
        <div
          v-if="liberados.has(conteudo.ordem) && !imagensCarregadas.has(conteudo.ordem)"
          class="absolute inset-0 flex items-center justify-center rounded bg-black/30"
        >
          <div class="flex flex-col items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-6 w-6 animate-spin text-white/80">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            <span class="text-xs text-white/80">Carregando...</span>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="ehTipo(conteudo.tipo, TipoConteudo.Arquivo)">
      <template v-if="isVideoConteudo(conteudo)">
        <!-- Placeholder conexão lenta para vídeo -->
        <div
          v-if="deveBloquear(conteudo)"
          class="flex h-[236px] w-[420px] max-w-full cursor-pointer items-center justify-center rounded border border-surface-200 bg-black/80"
          @click="liberar(conteudo)"
        >
          <div class="flex flex-col items-center gap-2 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-10 w-10 text-white/60">
              <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <span class="text-xs text-white/70">Toque para carregar</span>
          </div>
        </div>
        <template v-else>
          <div class="w-[420px] max-w-full">
            <video
              controls
              preload="metadata"
              :src="conteudo.localUrl || getAnexoUrl(conteudo.conteudo)"
              class="h-[236px] w-full rounded border border-surface-200 bg-black object-contain"
              @error="onImagemErro(conteudo)"
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
      </template>
      <div v-else class="-mx-1.5 flex items-center gap-2 rounded-lg px-2 py-2" :class="isOwn ? 'bg-white/10 text-primary-100' : 'bg-black/[0.04] dark:bg-white/[0.06] text-surface-800'">
        <div class="min-w-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="mx-auto h-7 w-7" :class="isOwn ? 'text-primary-200/70' : 'text-surface-500'"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
          <div class="mt-1 truncate text-[11px]" :title="conteudo.nome || 'Arquivo'">
            {{ conteudo.nome || 'Arquivo' }}
          </div>
        </div>
        <button
          v-if="!conteudo.localUrl && ehPdf(conteudo)"
          class="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-white"
          :class="isOwn ? 'bg-primary-100/20 hover:bg-primary-100/30 text-primary-100' : 'bg-primary-600 hover:bg-primary-700'"
          @click.prevent="pdfAberto = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
          Abrir
        </button>
        <VisualizadorPdf
          v-if="pdfAberto"
          :identificador="conteudo.conteudo"
          :nome="conteudo.nome || 'Arquivo.pdf'"
          @fechar="pdfAberto = false"
          @baixar="emit('download', conteudo.conteudo, conteudo.nome || 'Arquivo')"
        />
        <button
          v-if="!conteudo.localUrl"
          class="flex items-center gap-1 rounded px-2 py-1 text-xs text-white"
          :class="[isOwn ? 'bg-primary-100/20 hover:bg-primary-100/30 text-primary-100' : 'bg-primary-600 hover:bg-primary-700', ehPdf(conteudo) ? '' : 'ml-auto']"
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
    <TranscricaoAudio
      v-if="(ehTipo(conteudo.tipo, TipoConteudo.Audio) || ehTipo(conteudo.tipo, TipoConteudo.GravacaoAudio)) && !conteudo.localUrl && conteudo.conteudo"
      :identificador="conteudo.conteudo"
      :status-inicial="conteudo.transcricao_status"
      :texto-inicial="conteudo.transcricao"
    />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, inject, reactive, ref, watch } from 'vue'
import { TipoConteudo } from '../types/api'
import type { ConteudoMensagem } from '../types/api'
import { classeTextoMensagem, isVideoConteudo, normalizarExtensaoArquivo, parseLinks, parseTextSegments, formatarUrl } from '../utils/formatters'
import MencaoLink from './MencaoLink.vue'
import { useCodeHighlight, temCodigoFormatado, parseCodeBlocks } from '../composables/useCodeHighlight'
import { carregarMarkdown, ehLinguagemMarkdown } from '../composables/useMarkdown'
import { ehLinguagemMermaid, renderizarMermaid, substituirMermaidNoHtml } from '../composables/useMermaid'
import { useTheme } from '../composables/useTheme'
import type { SegmentoTexto } from '../utils/codeBlocks'
import { useConexao } from '../composables/useConexao'
import AudioPlayerArquivo from './AudioPlayerArquivo.vue'
import AudioPlayerGravacao from './AudioPlayerGravacao.vue'
import TranscricaoAudio from './TranscricaoAudio.vue'

// Carregado só ao abrir um PDF: é ele que traz o pdf.js
const VisualizadorPdf = defineAsyncComponent(() => import('./VisualizadorPdf.vue'))

const { conexaoLenta } = useConexao()
const renovarAnexoUrl = inject<(id: string) => Promise<void>>('renovarAnexoUrl')

function onImagemErro(conteudo: ConteudoMensagem) {
  if (!conteudo.localUrl && conteudo.conteudo && renovarAnexoUrl) {
    renovarAnexoUrl(conteudo.conteudo)
  }
}
const liberados = reactive(new Set<number>())
const imagensCarregadas = reactive(new Set<number>())

function deveBloquear(conteudo: ConteudoMensagem): boolean {
  if (conteudo.localUrl) return false
  if (!conexaoLenta.value) return false
  return !liberados.has(conteudo.ordem)
}

function liberar(conteudo: ConteudoMensagem) {
  liberados.add(conteudo.ordem)
}

function onImagemCarregada(conteudo: ConteudoMensagem) {
  imagensCarregadas.add(conteudo.ordem)
  emit('image-loaded')
}

const props = defineProps<{
  conteudo: ConteudoMensagem
  mensagemId: number
  conversaId?: number
  reproduzida?: boolean
  isOwn?: boolean
  codigoSemBorda?: boolean
  mostrarGradienteImagem?: boolean
  getAnexoUrl: (identificador: string) => string
}>()

const emit = defineEmits<{
  'open-image': [identificador: string, nome: string]
  'image-loaded': []
  'download': [identificador: string, nome: string]
}>()

const { codigosCopiados, copiarCodigo, highlightCodigo } = useCodeHighlight()

// Codigo longo vem recolhido, com altura maxima, e um botao para expandir.
// So ganha o botao o bloco que passa dessa altura. A chave separa as duas
// visoes de um bloco Markdown, que tem alturas diferentes.
const codigosLongos = reactive(new Set<string>())
const codigosExpandidos = reactive(new Set<string>())

function medirCodigo(el: Element | null, chave: string) {
  if (!el || codigosLongos.has(chave) || codigosExpandidos.has(chave)) return
  if (el.scrollHeight > el.clientHeight + 1) codigosLongos.add(chave)
}

function alternarCodigo(chave: string) {
  if (codigosExpandidos.has(chave)) codigosExpandidos.delete(chave)
  else codigosExpandidos.add(chave)
}

// Blocos ```md aparecem formatados e ```mermaid como diagrama (também os
// diagramas dentro do Markdown); "Código" mostra o texto cru.
const visualHtml = reactive(new Map<number, string>())
const verCodigo = reactive(new Set<number>())
const { isDark } = useTheme()

function ehVisualizavel(linguagem?: string) {
  return ehLinguagemMarkdown(linguagem) || ehLinguagemMermaid(linguagem)
}

function mostrarVisual(seg: SegmentoTexto, indice: number) {
  return ehVisualizavel(seg.linguagem) && !verCodigo.has(indice) && visualHtml.has(indice)
}

function chaveBloco(seg: SegmentoTexto, indice: number) {
  return mostrarVisual(seg, indice) ? `${indice}-visual` : String(indice)
}

// O tema entra porque o diagrama é desenhado com as cores do tema atual.
watch([() => props.conteudo.conteudo, isDark], async ([texto, escuro]) => {
  if (!ehTipo(props.conteudo.tipo, TipoConteudo.Texto) || !temCodigoFormatado(texto)) return
  const blocos = parseCodeBlocks(texto)
  for (const [indice, seg] of blocos.entries()) {
    if (seg.tipo !== 'codigo' || !ehVisualizavel(seg.linguagem)) continue
    const html = ehLinguagemMarkdown(seg.linguagem)
      ? await substituirMermaidNoHtml((await carregarMarkdown())(seg.conteudo), escuro)
      : await renderizarMermaid(seg.conteudo, escuro)
    if (html) visualHtml.set(indice, html)
    else visualHtml.delete(indice)
  }
}, { immediate: true })

// PDF abre num visualizador dentro da conversa
const pdfAberto = ref(false)

function ehPdf(conteudo: ConteudoMensagem) {
  return normalizarExtensaoArquivo(conteudo) === 'pdf'
}

// Estilo do Markdown formatado (o reset do Tailwind tira o de titulos, listas e tabelas).
const CLASSES_MARKDOWN = 'overflow-x-auto break-words bg-surface-50 p-3 text-sm leading-relaxed text-surface-800 '
  + '[&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold '
  + '[&_h3]:mb-1 [&_h3]:font-semibold [&_h4]:mb-1 [&_h4]:font-semibold [&_p]:mb-2 '
  + '[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 '
  + '[&_a]:text-primary-500 [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_del]:line-through '
  + '[&_code]:rounded [&_code]:bg-surface-200 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs '
  + '[&_pre]:mb-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-surface-200 [&_pre]:p-2 [&_pre_code]:px-0 '
  + '[&_blockquote]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-surface-300 [&_blockquote]:pl-3 [&_blockquote]:text-surface-600 '
  + '[&_table]:mb-2 [&_table]:border-collapse [&_th]:border [&_th]:border-surface-300 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold '
  + '[&_td]:border [&_td]:border-surface-300 [&_td]:px-2 [&_td]:py-1 [&_hr]:my-3 [&_hr]:border-surface-300 [&_img]:max-w-full '
  + '[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full [&>*:last-child]:mb-0'

function ehTipo(valor: number | string, tipo: number) {
  return Number(valor) === tipo
}
</script>