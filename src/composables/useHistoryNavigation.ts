import { ref } from 'vue'

export type SecaoId = 'chat' | 'config' | 'chamadas' | 'atividades' | 'equipes' | 'ramal' | 'anexos'
export type AbaConfigId = 'usuario' | 'dispositivos' | 'permissoes' | 'voip'

export interface AncoraScroll {
  mensagemId: number
  offset: number
}

export interface EstadoNavegacao {
  secao: SecaoId
  conversaId: number | null
  abaConfig: AbaConfigId | null
  ancora: AncoraScroll | null
}

const SECOES_SIMPLES: SecaoId[] = ['chamadas', 'atividades', 'equipes', 'ramal']
const ABAS_CONFIG: AbaConfigId[] = ['usuario', 'dispositivos', 'permissoes', 'voip']

function parseUrl(pathname: string): { secao: SecaoId; conversaId: number | null; abaConfig: AbaConfigId | null } {
  const partes = pathname.replace(/^\/+|\/+$/g, '').split('/')
  const primeiro = partes[0] || 'chat'

  if (primeiro === 'chat' || primeiro === '') {
    const id = Number(partes[1])
    return {
      secao: 'chat',
      conversaId: Number.isFinite(id) && id > 0 ? id : null,
      abaConfig: null
    }
  }
  if (primeiro === 'anexos') {
    const id = Number(partes[1])
    return {
      secao: 'anexos',
      conversaId: Number.isFinite(id) && id > 0 ? id : null,
      abaConfig: null
    }
  }
  if (primeiro === 'config') {
    const aba = partes[1] as AbaConfigId
    return {
      secao: 'config',
      conversaId: null,
      abaConfig: ABAS_CONFIG.includes(aba) ? aba : 'usuario'
    }
  }
  if ((SECOES_SIMPLES as string[]).includes(primeiro)) {
    return { secao: primeiro as SecaoId, conversaId: null, abaConfig: null }
  }
  return { secao: 'chat', conversaId: null, abaConfig: null }
}

function construirUrl(estado: EstadoNavegacao): string {
  if (estado.secao === 'chat') {
    return estado.conversaId ? `/chat/${estado.conversaId}` : '/chat'
  }
  if (estado.secao === 'anexos') {
    return estado.conversaId ? `/anexos/${estado.conversaId}` : '/anexos'
  }
  if (estado.secao === 'config') {
    return `/config/${estado.abaConfig || 'usuario'}`
  }
  return `/${estado.secao}`
}

function mesmoEstadoNavegacao(a: EstadoNavegacao, b: EstadoNavegacao): boolean {
  return a.secao === b.secao && a.conversaId === b.conversaId && a.abaConfig === b.abaConfig
}

export function useHistoryNavigation() {
  const estadoAtual = ref<EstadoNavegacao>({
    secao: 'chat',
    conversaId: null,
    abaConfig: null,
    ancora: null
  })

  // Flag ativa durante processamento de popstate — impede que watchers
  // em cima de secaoAtiva/conversaAtivaId disparem pushEstado em resposta
  // a mudanças causadas pelo próprio popstate, o que criaria entradas
  // duplicadas no histórico.
  let navegandoPorHistorico = false

  function estaNavegandoPorHistorico(): boolean {
    return navegandoPorHistorico
  }

  function inicializar() {
    const parsed = parseUrl(window.location.pathname)
    const stateNoHistorico = (window.history.state || {}) as Partial<EstadoNavegacao>

    // Em reload (Ctrl+F5 / F5), descartar âncora preservada pelo navegador —
    // o comportamento esperado é começar fresco (scroll ao fim ou primeira
    // não lida). Back/forward preservam a âncora normalmente pois popstate
    // lê o history.state do navegador, não passa por inicializar().
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const isReload = navEntry?.type === 'reload'

    const inicial: EstadoNavegacao = {
      secao: parsed.secao,
      conversaId: parsed.conversaId,
      abaConfig: parsed.abaConfig,
      ancora: isReload ? null : (stateNoHistorico.ancora || null)
    }
    estadoAtual.value = inicial
    // Normalizar history.state com a estrutura esperada
    window.history.replaceState(inicial, '', construirUrl(inicial))
  }

  function pushEstado(parcial: Partial<EstadoNavegacao>) {
    if (navegandoPorHistorico) return
    const merged: EstadoNavegacao = {
      secao: parcial.secao ?? estadoAtual.value.secao,
      conversaId: parcial.conversaId !== undefined ? parcial.conversaId : estadoAtual.value.conversaId,
      abaConfig: parcial.abaConfig !== undefined ? parcial.abaConfig : estadoAtual.value.abaConfig,
      ancora: null
    }
    if (merged.secao !== 'chat' && merged.secao !== 'anexos') merged.conversaId = null
    if (merged.secao !== 'config') merged.abaConfig = null

    // Se o estado navegável (ignorando âncora) é igual, usar replace
    if (mesmoEstadoNavegacao(merged, estadoAtual.value)) {
      window.history.replaceState(merged, '', construirUrl(merged))
    } else {
      window.history.pushState(merged, '', construirUrl(merged))
    }
    estadoAtual.value = merged
  }

  function replaceEstado(parcial: Partial<EstadoNavegacao>) {
    const merged: EstadoNavegacao = {
      secao: parcial.secao ?? estadoAtual.value.secao,
      conversaId: parcial.conversaId !== undefined ? parcial.conversaId : estadoAtual.value.conversaId,
      abaConfig: parcial.abaConfig !== undefined ? parcial.abaConfig : estadoAtual.value.abaConfig,
      ancora: parcial.ancora !== undefined ? parcial.ancora : estadoAtual.value.ancora
    }
    window.history.replaceState(merged, '', construirUrl(merged))
    estadoAtual.value = merged
  }

  function aoVoltarAvancar(callback: (estado: EstadoNavegacao) => void | Promise<void>): () => void {
    const handler = async (e: PopStateEvent) => {
      const stateRaw = e.state as Partial<EstadoNavegacao> | null
      const parsed = parseUrl(window.location.pathname)
      const estado: EstadoNavegacao = {
        secao: stateRaw?.secao ?? parsed.secao,
        conversaId: stateRaw?.conversaId ?? parsed.conversaId,
        abaConfig: stateRaw?.abaConfig ?? parsed.abaConfig,
        ancora: stateRaw?.ancora ?? null
      }
      estadoAtual.value = estado
      navegandoPorHistorico = true
      try {
        await callback(estado)
      } finally {
        // Libera no próximo macrotask para cobrir watchers de Vue (flush pre/post)
        // disparados pelas mudanças de estado dentro do callback.
        setTimeout(() => { navegandoPorHistorico = false }, 0)
      }
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }

  return {
    estadoAtual,
    inicializar,
    pushEstado,
    replaceEstado,
    aoVoltarAvancar,
    estaNavegandoPorHistorico
  }
}
