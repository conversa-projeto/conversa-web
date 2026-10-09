import { afterEach, describe, expect, test } from 'bun:test'
import { defineComponent, h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { EditorContent, useEditor, type Editor } from '@tiptap/vue-3'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import HardBreak from '@tiptap/extension-hard-break'
import { Gapcursor, UndoRedo } from '@tiptap/extensions'
import { Anexo, ExtensoesDoCampo, Figurinha, blocosDoDocumento, criarMencao, novoIdAnexo } from '@/editor/pecas'
import { TextSelection } from '@tiptap/pm/state'
import type { AnexoEditor } from '@/editor/pecas'

// Prova de conceito: o campo de mensagem no Tiptap, com as peças em Vue

let tela: VueWrapper | undefined
afterEach(() => {
  tela?.unmount()
  tela = undefined
  document.body.innerHTML = ''
})

async function montar(conteudo = '') {
  const anexos = new Map<string, AnexoEditor>()
  let editor: Editor | undefined
  const Campo = defineComponent({
    setup() {
      const instancia = useEditor({
        extensions: [Document, Paragraph, Text, HardBreak, Anexo.configure({ anexos }), Figurinha, criarMencao({}), Gapcursor, UndoRedo, ExtensoesDoCampo.PecasSelecionadas, ExtensoesDoCampo.AtalhosEmoji],
        content: conteudo,
      })
      return () => {
        editor = instancia.value
        return h(EditorContent, { editor: instancia.value })
      }
    },
  })
  tela = mount(Campo, { attachTo: document.body })
  await nextTick()
  await nextTick()
  const imagem = (nome = 'tela.png') => {
    const id = novoIdAnexo()
    anexos.set(id, { blob: new Blob(['png'], { type: 'image/png' }), nomeArquivo: nome, mimeType: 'image/png', url: `blob:${nome}` })
    return { type: 'anexo', attrs: { id } }
  }
  return { editor: editor!, anexos, imagem }
}

const tecla = (editor: Editor, key: string, extras: KeyboardEventInit = {}) =>
  editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extras }))

describe('campo de mensagem no Tiptap', () => {
  test('imagem entra como peça em Vue, com o "×", que a tira; Ctrl+Z traz de volta', async () => {
    const { editor, imagem } = await montar()
    editor.chain().focus().insertContent([{ type: 'paragraph', content: [{ type: 'text', text: 'olha' }] }, imagem()]).run()
    await nextTick()
    const img = () => document.querySelector<HTMLImageElement>('[data-anexo] img')
    expect(img()?.getAttribute('src')).toBe('blob:tela.png')
    // Uma ação depois da outra: em menos de meio segundo o editor junta as duas
    // num passo só do desfazer (como o navegador faz com a digitação)
    await new Promise((r) => setTimeout(r, 600))
    document.querySelector<HTMLElement>('[data-remover]')!.click()
    await nextTick()
    expect(img()).toBeNull()
    tecla(editor, 'z', { ctrlKey: true })
    expect(editor.getJSON().content!.map((no) => no.type)).toContain('anexo')
    // A peça em Vue é desenhada logo depois
    await new Promise((r) => setTimeout(r, 0))
    expect(img()).not.toBeNull()
  })

  test('imagem selecionada (clique ou seleção) fica destacada', async () => {
    const { editor, imagem } = await montar()
    editor.commands.setContent({ type: 'doc', content: [imagem(), { type: 'paragraph' }] })
    editor.commands.setNodeSelection(0)
    await nextTick()
    expect(document.querySelector('[data-anexo]')!.className).toContain('ring-2')
  })

  test('imagem dentro de uma seleção de texto fica marcada (azul), como o texto', async () => {
    const { editor, imagem } = await montar()
    editor.commands.setContent({ type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'antes' }] },
      imagem(),
      { type: 'paragraph', content: [{ type: 'text', text: 'depois' }] },
    ] })
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 2, editor.state.doc.content.size - 2)))
    await nextTick()
    expect(document.querySelector('[data-anexo]')!.hasAttribute('data-selecionada')).toBe(true)
    editor.commands.setTextSelection(3)
    await nextTick()
    expect(document.querySelector('[data-anexo]')!.hasAttribute('data-selecionada')).toBe(false)
  })

  test('atalho de emoji vira o emoji com o espaço depois', async () => {
    const { editor } = await montar('<p>oi :)</p>')
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    const { from, to } = editor.state.selection
    editor.view.someProp('handleTextInput', (f) => f(editor.view, from, to, ' ', () => editor.state.tr))
    expect(editor.getText()).toBe('oi 🙂 ')
  })

  test('rascunho salvo pelo campo antigo (HTML) abre no editor, com peças e menção', async () => {
    const { editor } = await montar('<p>oi</p><span data-anexo="anexo-1"></span><p><span data-mencao-id="2" data-nome="Ana">@Ana</span> tudo bem</p><span data-figurinha="basico/festa"></span>')
    const tipos = editor.getJSON().content!.map((no) => no.type)
    expect(tipos).toEqual(['paragraph', 'anexo', 'paragraph', 'figurinha'])
    expect(editor.getJSON().content![1]!.attrs).toEqual({ id: 'anexo-1' })
    expect(editor.getJSON().content![2]!.content![0]).toMatchObject({ type: 'mention', attrs: { id: '2', label: 'Ana' } })
  })

  test('os blocos da mensagem saem na ordem do campo, com a menção no texto', async () => {
    const { editor, anexos, imagem } = await montar()
    const primeira = imagem('a.png')
    const segunda = imagem('b.png')
    editor.commands.setContent({ type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'oi ' }, { type: 'mention', attrs: { id: '2', label: 'Bruno' } }] },
      primeira,
      segunda,
      { type: 'paragraph', content: [{ type: 'text', text: 'linha 1' }, { type: 'hardBreak' }, { type: 'text', text: 'linha 2' }] },
    ] })
    const blocos = blocosDoDocumento(editor.state.doc, anexos)
    expect(blocos.map((b) => ('texto' in b ? b.texto : 'arquivo' in b ? b.arquivo.nomeArquivo : '?'))).toEqual(['oi @[Bruno](2)', 'a.png', 'b.png', 'linha 1\nlinha 2'])
    // Duas imagens seguidas: nada entre elas
    expect(editor.state.doc.child(1).type.name).toBe('anexo')
    expect(editor.state.doc.child(2).type.name).toBe('anexo')
  })

  test('Backspace no começo da linha de baixo apaga a imagem como um caractere', async () => {
    const { editor, imagem } = await montar()
    editor.commands.setContent({ type: 'doc', content: [imagem(), { type: 'paragraph', content: [{ type: 'text', text: 'depois' }] }] })
    editor.commands.focus()
    editor.commands.setTextSelection(2)
    tecla(editor, 'Backspace')
    await nextTick()
    expect(document.querySelector('[data-anexo]')).toBeNull()
    expect(editor.getText()).toBe('depois')
  })
})
