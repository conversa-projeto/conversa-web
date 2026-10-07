import type { BlocoMensagem } from '../stores/chat'
import { ESPACO_INVISIVEL, type AnexoEditor } from './editorRico'

const BLOCOS_HTML = new Set(['DIV', 'P', 'LI'])

// Percorre o campo de mensagem na ordem em que aparece e devolve os blocos da
// mensagem: textos e peças (anexo, figurinha) intercalados. Menção fica dentro
// do texto, no formato @[Nome](id). Cada linha do campo (div, p ou <br) vira
// quebra de linha; texto vazio entre peças é descartado.
export function extrairBlocos(raiz: HTMLElement, anexos: Map<string, AnexoEditor>): BlocoMensagem[] {
  const blocos: BlocoMensagem[] = []
  let texto = ''

  const fecharTexto = () => {
    const limpo = texto.replace(/^\s*\n|\n\s*$/g, '').replace(/[ \t]+$/gm, '')
    if (limpo.trim()) blocos.push({ texto: limpo })
    texto = ''
  }

  const percorrer = (no: Node) => {
    if (no.nodeType === Node.TEXT_NODE) {
      texto += (no.textContent ?? '').replaceAll(ESPACO_INVISIVEL, '')
      return
    }
    if (!(no instanceof HTMLElement)) return
    if (no.tagName === 'BR') {
      texto += '\n'
      return
    }
    if (no.dataset.mencaoId) {
      texto += `@[${no.dataset.nome ?? ''}](${no.dataset.mencaoId})`
      return
    }
    if (no.dataset.anexo) {
      const anexo = anexos.get(no.dataset.anexo)
      if (anexo) {
        fecharTexto()
        blocos.push({ arquivo: anexo })
      }
      return
    }
    if (no.dataset.figurinha) {
      fecharTexto()
      blocos.push({ figurinha: no.dataset.figurinha })
      return
    }
    // Linha nova do campo: começa em outra linha
    const bloco = BLOCOS_HTML.has(no.tagName)
    if (bloco && texto && !texto.endsWith('\n')) texto += '\n'
    no.childNodes.forEach(percorrer)
    if (bloco && texto && !texto.endsWith('\n')) texto += '\n'
  }

  raiz.childNodes.forEach(percorrer)
  fecharTexto()
  return blocos
}
