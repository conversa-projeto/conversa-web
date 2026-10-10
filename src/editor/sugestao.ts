import { Extension } from '@tiptap/core'
import type { EditorState } from '@tiptap/pm/state'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// Sugestão da IA no campo, como no editor de código: o texto aparece em cinza
// depois do cursor, Tab aceita e Esc descarta. Qualquer mudança no campo (ou
// no cursor) apaga a sugestão. Quem pede a sugestão é o useSugestaoIa.

export interface SugestaoNoCampo {
  texto: string
  /** Posição do cursor quando a sugestão foi pedida */
  pos: number
}

export const chaveSugestao = new PluginKey<SugestaoNoCampo | null>('sugestaoIa')

export function sugestaoAtual(state: EditorState) {
  return chaveSugestao.getState(state) ?? null
}

export const SugestaoIa = Extension.create({
  name: 'sugestaoIa',
  // Antes do Tab que põe espaços e do Esc de outras extensões
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin<SugestaoNoCampo | null>({
        key: chaveSugestao,
        state: {
          init: () => null,
          apply(tr, atual) {
            const meta = tr.getMeta(chaveSugestao) as SugestaoNoCampo | null | undefined
            if (meta !== undefined) return meta
            return tr.docChanged || tr.selectionSet ? null : atual
          },
        },
        props: {
          decorations(state) {
            const sugestao = chaveSugestao.getState(state)
            if (!sugestao) return null
            return DecorationSet.create(state.doc, [
              Decoration.widget(sugestao.pos, () => {
                const elemento = document.createElement('span')
                elemento.className = 'pointer-events-none select-none text-surface-400'
                elemento.setAttribute('data-sugestao', '')
                elemento.setAttribute('aria-hidden', 'true')
                elemento.textContent = sugestao.texto
                return elemento
              }, { side: 1 }),
            ])
          },
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const sugestao = sugestaoAtual(this.editor.state)
        if (!sugestao) return false
        return this.editor.chain().setTextSelection(sugestao.pos).insertContent({ type: 'text', text: sugestao.texto }).run()
      },
      Escape: () => {
        if (!sugestaoAtual(this.editor.state)) return false
        this.editor.view.dispatch(this.editor.state.tr.setMeta(chaveSugestao, null))
        return true
      },
    }
  },
})
