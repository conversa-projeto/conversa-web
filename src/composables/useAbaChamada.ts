import { createApp, ref, type App } from 'vue'
import { pinia } from '../pinia'
import CallWindow from '../CallWindow.vue'

// Chamada de vídeo numa aba própria do navegador (no computador), em vez da
// janela flutuante. A conexão continua nesta aba (a do app): a outra só mostra
// a chamada, desenhada daqui, com o mesmo Vue e os mesmos dados (um app Vue
// carregado na outra aba não veria as mudanças destes dados). Estilos e tema
// são copiados para lá.

const NOME_DA_ABA = 'conversa-chamada'
const ESPERA_MAXIMA_MS = 10_000

const aberta = ref(false)
let aba: Window | null = null
let app: App | null = null
let observador: MutationObserver | null = null

// Tema (classe dark) e cores personalizadas (variáveis no style do <html>)
function copiarTema(destino: Document) {
  destino.documentElement.className = document.documentElement.className
  destino.documentElement.setAttribute('style', document.documentElement.getAttribute('style') ?? '')
}

function copiarEstilos(destino: Document) {
  for (const elemento of document.head.querySelectorAll('style, link[rel="stylesheet"]')) {
    destino.head.appendChild(elemento.cloneNode(true))
  }
}

function desmontar() {
  observador?.disconnect()
  observador = null
  app?.unmount()
  app = null
  aba = null
  aberta.value = false
}

function montar(destino: Window, aoFecharAba: () => void) {
  const raiz = destino.document.getElementById('chamada')
  if (!raiz) return
  copiarEstilos(destino.document)
  copiarTema(destino.document)
  observador = new MutationObserver(() => copiarTema(destino.document))
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] })

  app = createApp(CallWindow, {
    fecharAoEncerrar: true,
    // Fim da chamada: fecha a aba
    onFechar: () => fechar(),
  })
  app.use(pinia)
  app.mount(raiz)

  // A pessoa fechou a aba (ou recarregou): a chamada continua aqui
  destino.addEventListener('pagehide', () => {
    if (aba !== destino) return
    desmontar()
    aoFecharAba()
  })
}

function fechar() {
  const anterior = aba
  desmontar()
  anterior?.close()
}

// Abre (ou traz para a frente) a aba da chamada. Falso quando o navegador
// bloqueou a aba nova: a chamada fica dentro do app.
function abrir(aoFecharAba: () => void): boolean {
  if (aba && !aba.closed) {
    aba.focus()
    return true
  }
  const nova = window.open('/chamada.html', NOME_DA_ABA)
  if (!nova) return false
  aba = nova
  aberta.value = true
  // A aba nasce em branco e carrega a página depois: espera o lugar da chamada existir
  const inicio = Date.now()
  const esperar = () => {
    if (aba !== nova) return
    if (nova.closed) {
      desmontar()
      aoFecharAba()
      return
    }
    if (nova.document.readyState === 'complete' && nova.document.getElementById('chamada')) {
      montar(nova, aoFecharAba)
      return
    }
    if (Date.now() - inicio > ESPERA_MAXIMA_MS) {
      fechar()
      aoFecharAba()
      return
    }
    window.setTimeout(esperar, 50)
  }
  esperar()
  return true
}

export function useAbaChamada() {
  return { aberta, abrir, fechar }
}
