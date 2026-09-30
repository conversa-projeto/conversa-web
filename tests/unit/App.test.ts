import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import LoginForm from '@/components/LoginForm.vue'
import RegisterForm from '@/components/RegisterForm.vue'
import NavBar from '@/components/NavBar.vue'
import ChatHeader from '@/components/ChatHeader.vue'
import ChatSidebar from '@/components/ChatSidebar.vue'
import MessageList from '@/components/MessageList.vue'
import ChamadaHistorico from '@/components/ChamadaHistorico.vue'
import AnexosPage from '@/components/AnexosPage.vue'
import ForwardMessageModal from '@/components/ForwardMessageModal.vue'
import CallParticipantsModal from '@/components/CallParticipantsModal.vue'
import ProfileSettingsModal from '@/components/ProfileSettingsModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useCallStore } from '@/stores/call'
import { useChatStore } from '@/stores/chat'
import { useUploadProgress } from '@/composables/useUploadProgress'
import { TipoConteudo, TipoConversa, type Contato, type Mensagem } from '@/types/api'
import { aguardar, erro, pedidosDe, rota, SocketFalso } from './apiFalsa'
import { relogioFalso } from './relogioFalso'
import { instalarWebrtcFalso } from './webrtcFalso'

class ObservadorFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let tela: VueWrapper | undefined
const rolagemOriginal = Element.prototype.scrollIntoView
const EU = 7

beforeEach(() => {
  instalarWebrtcFalso()
  window.history.replaceState(null, '', '/chat')
  setActivePinia(createPinia())
  globalThis.ResizeObserver = ObservadorFalso as never
  Element.prototype.scrollIntoView = () => {}
})
afterEach(() => {
  tela?.unmount()
  tela = undefined
  Element.prototype.scrollIntoView = rolagemOriginal
  document.body.innerHTML = ''
})

const conversasApi = [
  { id: 1, descricao: 'Bruno', tipo: TipoConversa.Direta, destinatario_id: 2, inserida: new Date().toISOString() },
  { id: 5, descricao: 'Equipe', tipo: TipoConversa.Grupo, inserida: new Date().toISOString() },
]
const mensagemApi = (id: number, conversa_id = 1) => ({ id, remetente_id: 2, remetente: 'Bruno', conversa_id, inserida: new Date(2026, 2, 1).toISOString(), alterada: null, visivel_em: null, recebida: true, visualizada: true, reproduzida: false, conteudos: [{ ordem: 1, tipo: TipoConteudo.Texto, conteudo: `m${id}` }] })

function rotasDaSessao() {
  rota('GET', '/usuario/contatos', [{ id: 2, nome: 'Bruno', login: 'bruno', email: 'b@t' }, { id: 3, nome: 'Carla', login: 'carla', email: 'c@t' }])
  rota('GET', '/conversas', conversasApi)
  rota('GET', '/mensagens', [mensagemApi(10), mensagemApi(11)])
  rota('GET', '/sip', {})
  rota('GET', '/chamadas/pendentes', [])
  rota('GET', '/contatos/online', [])
  rota('GET', '/mensagens/novas', [])
  rota('GET', '/conversa/usuarios', [{ id: 1, usuario_id: EU, nome: 'Eu' }, { id: 2, usuario_id: 3, nome: 'Carla' }])
}

async function logado(url = '/chat') {
  localStorage.setItem('conversa.token', 'token')
  localStorage.setItem('conversa.user', JSON.stringify({ id: EU, nome: 'Eu Mesmo' }))
  window.history.replaceState(null, '', url)
  setActivePinia(createPinia())
  rotasDaSessao()
  tela = mount(App, { attachTo: document.body })
  await aguardar(40)
  return tela
}

async function abrirConversa(id: number) {
  await useChatStore().selecionarConversa(id)
  await aguardar(20)
}

describe('sem sessão', () => {
  test('mostra o login; Criar conta leva ao cadastro e volta', async () => {
    tela = mount(App, { attachTo: document.body })
    expect(tela.findComponent(LoginForm).exists()).toBe(true)
    tela.findComponent(LoginForm).vm.$emit('go-register')
    await aguardar()
    expect(tela.findComponent(RegisterForm).exists()).toBe(true)
    tela.findComponent(RegisterForm).vm.$emit('go-login')
    await aguardar()
    expect(tela.findComponent(LoginForm).exists()).toBe(true)
  })
})

describe('com sessão', () => {
  test('carrega conversas e ramal, sem conversa aberta', async () => {
    await logado()
    expect(pedidosDe('GET', '/conversas')).toHaveLength(1)
    expect(pedidosDe('GET', '/sip').length).toBeGreaterThan(0)
    expect(tela!.text()).toContain('Selecione uma conversa.')
    expect(tela!.findComponent(NavBar).props('inicialUsuario')).toBe('E')
  })

  test('sessão vencida (401) volta ao login sem mensagem de erro', async () => {
    localStorage.setItem('conversa.token', 'token')
    localStorage.setItem('conversa.user', JSON.stringify({ id: EU, nome: 'Eu' }))
    setActivePinia(createPinia())
    rota('GET', '/usuario/contatos', erro(401, 'Token inválido'))
    rota('GET', '/conversas', [])
    tela = mount(App, { attachTo: document.body })
    await aguardar(30)
    expect(tela.findComponent(LoginForm).exists()).toBe(true)
    expect(tela.text()).not.toContain('Token inválido')
  })

  test('outra falha ao iniciar volta ao login e mostra o erro', async () => {
    localStorage.setItem('conversa.token', 'token')
    localStorage.setItem('conversa.user', JSON.stringify({ id: EU, nome: 'Eu' }))
    setActivePinia(createPinia())
    rota('GET', '/usuario/contatos', erro(500, 'Banco fora do ar'))
    rota('GET', '/conversas', [])
    tela = mount(App, { attachTo: document.body })
    await aguardar(30)
    expect(tela.text()).toContain('Banco fora do ar')
    await tela.find('.bg-danger-600 button').trigger('click')
    expect(tela.text()).not.toContain('Banco fora do ar')
  })

  test('link direto /chat/1 abre a conversa', async () => {
    await logado('/chat/1')
    expect(useChatStore().conversaAtivaId).toBe(1)
    expect(tela!.findComponent(ChatHeader).exists()).toBe(true)
    expect(tela!.findComponent(MessageList).exists()).toBe(true)
  })

  test('trocar de seção muda a tela e a URL', async () => {
    await logado()
    const nav = tela!.findComponent(NavBar)
    nav.vm.$emit('update:secaoAtiva', 'chamadas')
    await aguardar(10)
    expect(tela!.findComponent(ChamadaHistorico).exists()).toBe(true)
    expect(window.location.pathname).toBe('/chamadas')
    nav.vm.$emit('update:secaoAtiva', 'atividades')
    await aguardar()
    expect(tela!.text()).toContain('Em desenvolvimento')
    nav.vm.$emit('update:secaoAtiva', 'anexos')
    await aguardar()
    expect(tela!.findComponent(AnexosPage).exists()).toBe(true)
    expect(window.location.pathname).toBe('/anexos')
  })

  test('voltar no navegador restaura a seção', async () => {
    await logado()
    tela!.findComponent(NavBar).vm.$emit('update:secaoAtiva', 'chamadas')
    await aguardar(10)
    window.history.replaceState({ secao: 'chat', conversaId: 1, abaConfig: null, ancora: null }, '', '/chat/1')
    window.dispatchEvent(new PopStateEvent('popstate', { state: { secao: 'chat', conversaId: 1, abaConfig: null, ancora: null } }))
    await aguardar(30)
    expect(tela!.findComponent(ChamadaHistorico).exists()).toBe(false)
    expect(useChatStore().conversaAtivaId).toBe(1)
  })

  test('Ver anexos de uma conversa abre a página de anexos nela', async () => {
    rota('GET', '/anexos', [])
    await logado()
    tela!.findComponent(ChatSidebar).vm.$emit('open-anexos', 5)
    await aguardar(10)
    expect(tela!.findComponent(AnexosPage).props('conversaIdInicial')).toBe(5)
    expect(window.location.pathname).toBe('/anexos/5')
  })

  test('configurações e sair da conta', async () => {
    await logado()
    tela!.findComponent(NavBar).vm.$emit('update:secaoAtiva', 'config')
    await aguardar(10)
    const config = tela!.findComponent(ProfileSettingsModal)
    expect(config.exists()).toBe(true)
    config.vm.$emit('close')
    await aguardar(10)
    expect(tela!.findComponent(ProfileSettingsModal).exists()).toBe(false)
    tela!.findComponent(NavBar).vm.$emit('update:secaoAtiva', 'config')
    await aguardar(10)
    tela!.findComponent(ProfileSettingsModal).vm.$emit('logout')
    await aguardar(10)
    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(tela!.findComponent(LoginForm).exists()).toBe(true)
  })
})

describe('chamadas a partir da conversa', () => {
  test('conversa direta liga para o destinatário; erro aparece', async () => {
    await logado()
    await abrirConversa(1)
    const call = useCallStore()
    const chamadas: unknown[][] = []
    call.iniciarChamada = (async (...args: unknown[]) => { chamadas.push(args); if (chamadas.length > 1) throw new Error('Sem microfone') }) as never
    tela!.findComponent(ChatHeader).vm.$emit('start-call', 1)
    tela!.findComponent(ChatHeader).vm.$emit('start-call', 2, true)
    await aguardar(10)
    expect(chamadas).toEqual([[1, [{ id: EU }, { id: 2 }], false], [2, [{ id: EU }, { id: 2 }], true]])
    expect(tela!.text()).toContain('Sem microfone')
  })

  test('grupo liga para os membros', async () => {
    await logado()
    await abrirConversa(5)
    const chamadas: unknown[][] = []
    useCallStore().iniciarChamada = (async (...args: unknown[]) => void chamadas.push(args)) as never
    tela!.findComponent(ChatHeader).vm.$emit('start-call', 1)
    await aguardar(10)
    expect(chamadas).toEqual([[1, [{ id: EU }, { id: 3 }], false]])
  })

  test('escolher participantes: confirma ou cancela', async () => {
    await logado()
    const chamadas: unknown[][] = []
    useCallStore().iniciarChamada = (async (...args: unknown[]) => void chamadas.push(args)) as never
    const modal = tela!.findComponent(CallParticipantsModal)
    modal.vm.$emit('confirm', [])
    modal.vm.$emit('confirm', [2, 3])
    modal.vm.$emit('close')
    await aguardar(10)
    expect(chamadas).toEqual([[1, [{ id: EU }, { id: 2 }, { id: 3 }], false]])
  })
})

describe('mensagens', () => {
  test('encaminhar para conversa ou contato; erro aparece', async () => {
    await logado()
    await abrirConversa(1)
    const chat = useChatStore()
    const feitos: unknown[] = []
    chat.encaminharMensagemParaConversa = (async (_m: Mensagem, id: number) => void feitos.push(id)) as never
    chat.encaminharMensagemParaContato = (async (_m: Mensagem, c: Contato) => { throw new Error(`Falhou para ${c.nome}`) }) as never
    tela!.findComponent(MessageList).vm.$emit('forward', chat.mensagensAtivas[0])
    await aguardar()
    const modal = () => tela!.findComponent(ForwardMessageModal)
    expect(modal().props('aberta')).toBe(true)
    modal().vm.$emit('select-conversation', 5)
    await aguardar(10)
    expect(feitos).toEqual([5])
    expect(modal().props('aberta')).toBe(false)
    tela!.findComponent(MessageList).vm.$emit('forward', chat.mensagensAtivas[0])
    await aguardar()
    modal().vm.$emit('select-contact', { id: 3, nome: 'Carla' })
    await aguardar(10)
    expect(tela!.text()).toContain('Falhou para Carla')
    modal().vm.$emit('close')
    await aguardar()
    expect(modal().props('aberta')).toBe(false)
  })

  test('resultado da pesquisa global abre a conversa dele', async () => {
    await logado()
    tela!.findComponent(ChatSidebar).vm.$emit('open-search-message', 5, 11)
    await aguardar(20)
    expect(useChatStore().conversaAtivaId).toBe(5)
  })

  test('abrir a conversa numa janela separada', async () => {
    await logado()
    const abertas: string[] = []
    const abrirOriginal = window.open
    window.open = ((url: string) => void abertas.push(url)) as unknown as typeof window.open
    try {
      tela!.findComponent(ChatSidebar).vm.$emit('popout', 5)
      tela!.findComponent(ChatSidebar).vm.$emit('popout')
      expect(abertas).toEqual(['/chat-popup.html?conversa=5'])
    } finally {
      window.open = abrirOriginal
    }
  })

  test('clique na notificação (service worker) abre a conversa', async () => {
    const ouvintes: ((e: MessageEvent) => void)[] = []
    Object.defineProperty(navigator, 'serviceWorker', { value: { addEventListener: (_t: string, f: (e: MessageEvent) => void) => ouvintes.push(f), removeEventListener: () => {}, getRegistrations: async () => [] }, configurable: true })
    try {
      await logado()
      ouvintes[0]!(new MessageEvent('message', { data: { tipo: 'conversa-abrir', conversaId: '5' } }))
      await aguardar(20)
      expect(useChatStore().conversaAtivaId).toBe(5)
    } finally {
      delete (navigator as { serviceWorker?: unknown }).serviceWorker
    }
  })

  test('com envio em andamento, fechar a aba pede confirmação', async () => {
    await logado()
    const envios = useUploadProgress()
    envios.iniciarUpload('x', 'video.mp4')
    try {
      const evento = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(evento)
      expect(evento.defaultPrevented).toBe(true)
    } finally {
      envios.limparTodos()
    }
    const semEnvio = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(semEnvio)
    expect(semEnvio.defaultPrevented).toBe(false)
  })

  test('menu do botão direito do navegador só nos campos de texto', async () => {
    await logado('/chat/1')
    const fora = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    tela!.find('main').element.dispatchEvent(fora)
    expect(fora.defaultPrevented).toBe(true)
    const noCampo = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    tela!.find('textarea').element.dispatchEvent(noCampo)
    expect(noCampo.defaultPrevented).toBe(false)
  })
})

describe('conexão em tempo real', () => {
  test('caída por mais de 5 segundos mostra o aviso; voltou, some', async () => {
    const relogio = relogioFalso()
    try {
      await logado()
      const socket = SocketFalso.ultimo()
      socket.abrir()
      await aguardar(5)
      socket.cair()
      await aguardar(5)
      relogio.avancar(4999)
      await aguardar()
      expect(tela!.text()).not.toContain('Conexao em tempo real indisponivel')
      relogio.avancar(1)
      await aguardar()
      expect(tela!.text()).toContain('Conexao em tempo real indisponivel')
      relogio.avancar(60_000)
      SocketFalso.ultimo().abrir()
      await aguardar(5)
      expect(tela!.text()).not.toContain('Conexao em tempo real indisponivel')
    } finally {
      relogio.restaurar()
    }
  })
})

