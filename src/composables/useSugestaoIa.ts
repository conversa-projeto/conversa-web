import type { Editor } from '@tiptap/core'
import { computed, onBeforeUnmount, ref, type Ref } from 'vue'
import { chaveSugestao } from '../editor/sugestao'
import { sugerirTexto } from '../services/conversaApi'
import { useRecursos } from './useRecursos'

// Sugestões da IA no campo de mensagem: depois de uma pausa na digitação, com
// o cursor no fim do texto, pede a continuação ao servidor e mostra em cinza
// (editor/sugestao.ts). Cada pessoa liga ou desliga, neste navegador.

const CHAVE_PREFERENCIA = 'conversa.sugestoesIa'
const PAUSA_MS = 600
const MINIMO_CARACTERES = 3

function lerPreferencia() {
  try {
    return localStorage.getItem(CHAVE_PREFERENCIA) !== '0'
  } catch {
    return true
  }
}

const ligadas = ref(lerPreferencia())

export function usePreferenciaSugestoes() {
  const { recursos } = useRecursos()
  function alterar(valor: boolean) {
    ligadas.value = valor
    try {
      localStorage.setItem(CHAVE_PREFERENCIA, valor ? '1' : '0')
    } catch {
      // vale só até fechar a página
    }
  }
  return { ligadas: computed(() => ligadas.value), disponivel: computed(() => recursos.value.ia), alterar }
}

export function useSugestaoIa(editor: Ref<Editor | undefined>, opcoes: { conversaId: () => number | null; bloqueada: () => boolean }) {
  const { recursos } = useRecursos()
  let espera: number | null = null
  let pedido: AbortController | null = null

  function cancelar() {
    if (espera !== null) window.clearTimeout(espera)
    espera = null
    pedido?.abort()
    pedido = null
  }

  // A cada mudança no texto: recomeça a contar a pausa
  function aoDigitar() {
    cancelar()
    if (!ligadas.value || !recursos.value.ia) return
    espera = window.setTimeout(() => { espera = null; void pedir() }, PAUSA_MS)
  }

  async function pedir() {
    const ed = editor.value
    const conversa = opcoes.conversaId()
    if (!ed || !conversa || opcoes.bloqueada() || !ed.isFocused) return
    const { state } = ed
    const { selection, doc } = state
    // Só com o cursor no fim: depois dele, nada além de espaço e peças
    if (!selection.empty || doc.textBetween(selection.from, doc.content.size, '\n', '').trim()) return
    const texto = doc.textBetween(0, selection.from, '\n', ' ')
    if (texto.trim().length < MINIMO_CARACTERES) return

    const controle = new AbortController()
    pedido = controle
    try {
      const { sugestao } = await sugerirTexto(conversa, texto, controle.signal)
      // Mudou alguma coisa enquanto a IA pensava: a sugestão não vale mais
      if (!sugestao || pedido !== controle || ed.state.doc !== doc || ed.state.selection.from !== selection.from) return
      ed.view.dispatch(ed.state.tr.setMeta(chaveSugestao, { texto: sugestao, pos: selection.from }))
    } catch {
      // sem sugestão
    } finally {
      if (pedido === controle) pedido = null
    }
  }

  onBeforeUnmount(cancelar)

  return { aoDigitar, cancelar }
}
