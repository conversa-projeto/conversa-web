import { Extension, Node } from '@tiptap/core'
import type { Node as NoDocumento } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import Mention from '@tiptap/extension-mention'
import type { SuggestionOptions } from '@tiptap/suggestion'
import type { BlocoMensagem } from '../stores/chat'
import { substituirAtalhoAntesDoCursor } from '../utils/emojiAtalhos'
import PecaAnexo from './PecaAnexo.vue'
import PecaFigurinha from './PecaFigurinha.vue'

// Peças do campo de mensagem no editor (Tiptap): imagem, vídeo, áudio,
// arquivo e figurinha são blocos que não se editam por dentro; a menção fica
// no meio do texto. O editor cuida de apagar como um caractere, selecionar,
// desfazer, arrastar para mudar a ordem e pôr o cursor entre elas.

export interface AnexoEditor {
  blob: Blob
  nomeArquivo: string
  mimeType: string
  isAudio?: boolean
  isGravacaoAudio?: boolean
  /** Prévia (blob URL), liberada quando o campo é limpo */
  url?: string
}

let proximoId = 0
// Única também entre recargas: o rascunho guarda as chaves das peças
export const novoIdAnexo = () => `anexo-${Date.now().toString(36)}-${++proximoId}`

export function liberarPrevias(anexos: Map<string, AnexoEditor>) {
  for (const anexo of anexos.values()) {
    if (anexo.url) URL.revokeObjectURL(anexo.url)
  }
}

// Arrasto que começou dentro do campo (mudar a ordem das peças): o aviso de
// "solte para enviar o arquivo" da conversa não vale para ele
export const arrastoNoCampo = { ativo: false }

export interface OpcoesAnexo {
  anexos: Map<string, AnexoEditor>
  aoAbrirImagem: (id: string) => void
}

export const Anexo = Node.create<OpcoesAnexo>({
  name: 'anexo',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addOptions: () => ({ anexos: new Map(), aoAbrirImagem: () => {} }),
  addAttributes: () => ({ id: { default: null } }),
  // span[data-anexo]: rascunho salvo pelo campo antigo, em HTML
  parseHTML: () => [{ tag: 'div[data-anexo]' }, { tag: 'span[data-anexo]' }].map((regra) => ({ ...regra, getAttrs: (el: HTMLElement) => ({ id: el.dataset.anexo }) })),
  renderHTML: ({ HTMLAttributes }) => ['div', { 'data-anexo': HTMLAttributes.id }],
  addNodeView: () => VueNodeViewRenderer(PecaAnexo),
})

export const Figurinha = Node.create({
  name: 'figurinha',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes: () => ({ figurinha: { default: '' } }),
  parseHTML: () => [{ tag: '[data-figurinha]', getAttrs: (el: HTMLElement) => ({ figurinha: el.dataset.figurinha }) }],
  renderHTML: ({ HTMLAttributes }) => ['div', { 'data-figurinha': HTMLAttributes.figurinha }],
  addNodeView: () => VueNodeViewRenderer(PecaFigurinha),
})

// Menção: "@Nome" no texto, que vai na mensagem como @[Nome](id). A lista de
// sugestões é a do campo (suggestion.render).
export function criarMencao(sugestao: Omit<SuggestionOptions, 'editor'>) {
  return Mention.extend({
    // span[data-mencao-id]: rascunho salvo pelo campo antigo
    parseHTML() {
      return [
        { tag: 'span[data-type="mention"]', getAttrs: (el: HTMLElement) => ({ id: el.dataset.id, label: el.dataset.label }) },
        { tag: 'span[data-mencao-id]', getAttrs: (el: HTMLElement) => ({ id: el.dataset.mencaoId, label: el.dataset.nome }) },
      ]
    },
  }).configure({
    HTMLAttributes: { class: 'rounded-sm bg-primary-50 text-primary-600 dark:bg-primary-900/30' },
    renderText: ({ node }) => `@${node.attrs.label}`,
    renderHTML: ({ node, options }) => ['span', options.HTMLAttributes, `@${node.attrs.label}`],
    deleteTriggerWithBackspace: true,
    suggestion: { allowSpaces: true, ...sugestao },
  })
}

// Peça dentro de uma seleção de texto: o navegador não pinta o que não se
// edita, então ela ganha o data-selecionada e fica azul como o texto
const chaveSelecao = new PluginKey('pecasSelecionadas')
const PecasSelecionadas = Extension.create({
  name: 'pecasSelecionadas',
  addProseMirrorPlugins: () => [new Plugin({
    key: chaveSelecao,
    props: {
      decorations(state) {
        const { from, to, empty } = state.selection
        if (empty) return null
        const marcas: Decoration[] = []
        state.doc.nodesBetween(from, to, (no, posicao) => {
          if (no.isAtom && !no.isText && posicao >= from && posicao + no.nodeSize <= to) {
            marcas.push(Decoration.node(posicao, posicao + no.nodeSize, { 'data-selecionada': '' }))
          }
        })
        return DecorationSet.create(state.doc, marcas)
      },
    },
  })],
})

// Atalho de emoji (":)" e afins) vira o emoji quando vem o espaço depois dele
const AtalhosEmoji = Extension.create({
  name: 'atalhosEmoji',
  addProseMirrorPlugins: () => [new Plugin({
    props: {
      handleTextInput(view, from, to, texto) {
        if (texto !== ' ') return false
        const $de = view.state.doc.resolve(from)
        if (!$de.parent.isTextblock) return false
        const inicio = $de.start()
        // Uma letra por posição: quebra de linha vira \n, menção um sinal qualquer
        const antes = view.state.doc.textBetween(inicio, from, '\n', (no) => (no.type.name === 'hardBreak' ? '\n' : '￼')) + ' '
        const troca = substituirAtalhoAntesDoCursor(antes, antes.length)
        if (!troca) return false
        let comum = 0
        while (comum < antes.length - 1 && antes[comum] === troca.texto[comum]) comum++
        view.dispatch(view.state.tr.insertText(troca.texto.slice(comum), inicio + comum, to))
        return true
      },
    },
  })],
})

export interface OpcoesTeclas {
  /** Enter: envia (true quando tratou) */
  aoEnter: () => boolean
}

// Enter envia, Shift+Enter quebra a linha, Tab põe espaços (Shift+Tab sai do campo)
const Teclas = Extension.create<OpcoesTeclas>({
  name: 'teclasDoCampo',
  addOptions: () => ({ aoEnter: () => false }),
  addKeyboardShortcuts() {
    return {
      Enter: () => this.options.aoEnter(),
      'Shift-Enter': () => this.editor.commands.setHardBreak(),
      Tab: () => this.editor.commands.insertContent({ type: 'text', text: '    ' }),
    }
  },
  // Arrastar uma peça de dentro do campo é mudar a ordem, não enviar arquivo
  addProseMirrorPlugins: () => [new Plugin({
    props: {
      handleDOMEvents: {
        dragstart: () => { arrastoNoCampo.ativo = true; return false },
        dragend: () => { arrastoNoCampo.ativo = false; return false },
        drop: () => { arrastoNoCampo.ativo = false; return false },
      },
    },
  })],
})

export const ExtensoesDoCampo = { PecasSelecionadas, AtalhosEmoji, Teclas }

// O documento do campo, na ordem, nos blocos da mensagem: texto (linhas
// juntas), arquivo e figurinha. Texto vazio entre peças é descartado.
export function blocosDoDocumento(doc: NoDocumento, anexos: Map<string, AnexoEditor>): BlocoMensagem[] {
  const blocos: BlocoMensagem[] = []
  let linhas: string[] = []

  const fecharTexto = () => {
    const texto = linhas.join('\n').replace(/[ \t]+$/gm, '').replace(/^\n+|\n+$/g, '')
    if (texto.trim()) blocos.push({ texto })
    linhas = []
  }

  doc.forEach((no) => {
    if (no.type.name === 'anexo') {
      const anexo = anexos.get(no.attrs.id)
      if (anexo) {
        fecharTexto()
        blocos.push({ arquivo: anexo })
      }
      return
    }
    if (no.type.name === 'figurinha') {
      fecharTexto()
      blocos.push({ figurinha: no.attrs.figurinha })
      return
    }
    let linha = ''
    no.forEach((trecho) => {
      if (trecho.isText) linha += trecho.text
      else if (trecho.type.name === 'hardBreak') linha += '\n'
      else if (trecho.type.name === 'mention') linha += `@[${trecho.attrs.label}](${trecho.attrs.id})`
    })
    linhas.push(linha)
  })
  fecharTexto()
  return blocos
}
