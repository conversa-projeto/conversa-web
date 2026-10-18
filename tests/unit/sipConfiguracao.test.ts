import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ConfiguracaoAcessos from '@/components/ConfiguracaoAcessos.vue'
import ConfiguracaoSipUsuario from '@/components/ConfiguracaoSipUsuario.vue'
import ConfiguracaoVoip from '@/components/ConfiguracaoVoip.vue'
import ProfileSettingsModal from '@/components/ProfileSettingsModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useSipStore } from '@/stores/sip'
import { aguardar, erro, pedidos, pedidosDe, rota } from './apiFalsa'
import { relogioFalso } from './relogioFalso'
import { sipCriados } from './sipFalso'
import { instalarWebrtcFalso } from './webrtcFalso'

const EU = 7
let tela: VueWrapper | undefined

beforeEach(() => {
  localStorage.setItem('conversa.token', 'token')
  localStorage.setItem('conversa.user', JSON.stringify({ id: EU, nome: 'Eu Mesmo', login: 'eu' }))
  setActivePinia(createPinia())
})
afterEach(() => {
  tela?.unmount()
  tela = undefined
  document.body.innerHTML = ''
})

// Como o administrador vê o ramal: sem as senhas
const ramalAdmin = (extras: Record<string, unknown> = {}) => ({
  id: 3, usuario_id: 2, sip_user: '9996', auth_user: null, display_name: null, domain: 'voip.igerp.com',
  ws_server: 'wss://voip.igerp.com:8089/ws', turn_server: null, turn_user: null, ativo: true, tem_senha: true, tem_senha_turn: false,
  ...extras,
})

const campo = (rotulo: string) => tela!.findAll('label').find((l) => l.text().startsWith(rotulo))!.find('input')
const botao = (texto: string) => tela!.findAll('button').find((b) => b.text() === texto)!
const enviar = async () => {
  await tela!.find('form').trigger('submit')
  await aguardar(10)
}

describe('painel de cada pessoa em Pessoas › Usuários', () => {
  const permissoesApi = {
    permissoes: [{ codigo: 'sip', descricao: 'Configurar a telefonia (SIP) das pessoas', uso: false }],
    usuarios: [
      { id: 2, nome: 'Ana', login: 'ana', permissoes: [] },
      { id: 4, nome: 'Robô', login: 'robo', bot: true, permissoes: [] },
    ],
  }
  async function abrir(minhas: string[]) {
    rota('GET', '/permissoes', permissoesApi)
    rota('GET', '/usuario/permissoes', minhas)
    await useAuthStore().carregarPermissoes()
    tela = mount(ConfiguracaoAcessos, { attachTo: document.body })
    await aguardar(10)
  }
  const pessoa = (nome: string) => tela!.findAll('button[aria-expanded]').find((b) => b.text().includes(nome))!
  const abas = () => tela!.findAll('[role="tab"]').map((b) => b.text())

  test('com a permissão "sip", a pessoa tem as abas Acessos e Telefonia (SIP); a de SIP abre o ramal dela', async () => {
    rota('GET', '/sip/usuario', ramalAdmin())
    await abrir(['permissoes', 'sip'])
    await pessoa('Ana').trigger('click')
    expect(abas()).toEqual(['Acessos', 'Telefonia (SIP)'])
    // Começa nos acessos
    expect(tela!.find('fieldset input[type="checkbox"]').exists()).toBe(true)
    await tela!.findAll('[role="tab"]')[1]!.trigger('click')
    await aguardar(10)
    expect(pedidosDe('GET', '/sip/usuario')[0]!.consulta).toEqual({ usuario_id: '2' })
    expect((campo('Ramal').element as HTMLInputElement).value).toBe('9996')
    expect(tela!.text()).toContain('Salvar ramal')
  })

  test('a permissão "sip" aparece com o nome curto', async () => {
    await abrir(['permissoes', 'sip'])
    await pessoa('Ana').trigger('click')
    expect(tela!.text()).toContain('Configurar o SIP')
  })

  test('sem a permissão "sip", sem a aba (só os acessos)', async () => {
    await abrir(['permissoes'])
    await pessoa('Ana').trigger('click')
    expect(abas()).toEqual([])
    expect(pedidosDe('GET', '/sip/usuario')).toHaveLength(0)
  })

  test('bot não tem ramal', async () => {
    await abrir(['permissoes', 'sip'])
    await pessoa('Robô').trigger('click')
    expect(abas()).toEqual([])
  })
})

describe('ramal da pessoa (administrador)', () => {
  async function abrir(usuario = { id: 2, nome: 'Ana' }) {
    tela = mount(ConfiguracaoSipUsuario, { props: { usuario }, attachTo: document.body })
    await aguardar(10)
  }

  test('pessoa sem ramal: cria com os dados do telefone de teste, só STUN', async () => {
    rota('GET', '/sip/usuario', {})
    rota('PUT', '/sip/usuario', ramalAdmin())
    await abrir()
    expect(tela!.text()).toContain('Criar ramal')
    expect(tela!.text()).not.toContain('Excluir ramal')
    await campo('Ramal').setValue('9996')
    await campo('Senha do ramal').setValue('FLUX@teste')
    await campo('Domínio SIP').setValue('voip.igerp.com')
    await campo('Servidor WebSocket').setValue('wss://voip.igerp.com:8089/ws')
    await enviar()
    expect(pedidosDe('PUT', '/sip/usuario')[0]!.corpo).toEqual({
      usuario_id: 2, sip_user: '9996', sip_password: 'FLUX@teste', domain: 'voip.igerp.com', ws_server: 'wss://voip.igerp.com:8089/ws',
      auth_user: null, display_name: null, turn_server: null, turn_user: null, turn_password: null, ativo: true,
    })
    expect(tela!.text()).toContain('Ramal salvo.')
    // Salvo, a senha não volta: o campo fica vazio, "vazio mantém"
    expect((campo('Senha do ramal').element as HTMLInputElement).value).toBe('')
    expect(campo('Senha do ramal').attributes('placeholder')).toBe('Salva (vazio mantém)')
    expect(tela!.text()).toContain('Excluir ramal')
  })

  test('confere antes de mandar: sem senha no novo, WebSocket sem wss://, TURN sem usuário', async () => {
    rota('GET', '/sip/usuario', {})
    await abrir()
    await campo('Ramal').setValue('9996')
    await campo('Domínio SIP').setValue('voip.igerp.com')
    await campo('Servidor WebSocket').setValue('wss://voip.igerp.com:8089/ws')
    await enviar()
    expect(tela!.text()).toContain('Informe a senha do ramal.')
    await campo('Senha do ramal').setValue('x')
    await campo('Servidor WebSocket').setValue('voip.igerp.com:8089/ws')
    await enviar()
    expect(tela!.text()).toContain('deve começar com wss://')
    await campo('Servidor WebSocket').setValue('wss://voip.igerp.com:8089/ws')
    await tela!.find('input[placeholder="turns:voip.empresa.com:443"]').setValue('turns:voip.igerp.com:443')
    await enviar()
    expect(tela!.text()).toContain('Informe o usuário do TURN.')
    expect(pedidosDe('PUT', '/sip/usuario')).toHaveLength(0)
  })

  test('alterar sem digitar a senha manda null (mantém a salva); o TURN do PABX vai com usuário e senha', async () => {
    rota('GET', '/sip/usuario', ramalAdmin())
    rota('PUT', '/sip/usuario', ramalAdmin({ turn_server: 'turns:voip.igerp.com:443', turn_user: 'webrtc', tem_senha_turn: true }))
    await abrir()
    const fieldset = tela!.find('fieldset')
    const [servidor, usuario, senha] = fieldset.findAll('input')
    // Usuário e senha do TURN só com o servidor
    expect(usuario!.attributes('disabled')).toBeDefined()
    await servidor!.setValue('turns:voip.igerp.com:443')
    expect(usuario!.attributes('disabled')).toBeUndefined()
    await usuario!.setValue('webrtc')
    await senha!.setValue('segredo-turn')
    await enviar()
    expect(pedidosDe('PUT', '/sip/usuario')[0]!.corpo).toMatchObject({
      sip_password: null, turn_server: 'turns:voip.igerp.com:443', turn_user: 'webrtc', turn_password: 'segredo-turn',
    })
    expect(fieldset.findAll('input')[2]!.attributes('placeholder')).toBe('Salva (vazio mantém)')
  })

  test('tirar o servidor TURN não manda usuário nem senha dele', async () => {
    rota('GET', '/sip/usuario', ramalAdmin({ turn_server: 'turns:voip.igerp.com:443', turn_user: 'webrtc', tem_senha_turn: true }))
    rota('PUT', '/sip/usuario', ramalAdmin())
    await abrir()
    await tela!.find('fieldset input').setValue('')
    await enviar()
    expect(pedidosDe('PUT', '/sip/usuario')[0]!.corpo).toMatchObject({ turn_server: null, turn_user: null, turn_password: null })
  })

  test('recusa do servidor aparece', async () => {
    rota('GET', '/sip/usuario', ramalAdmin())
    rota('PUT', '/sip/usuario', erro(403, 'Acesso negado!'))
    await abrir()
    await enviar()
    expect(tela!.text()).toContain('Acesso negado!')
  })

  test('excluir pede confirmação; confirmado, volta a ser ramal novo', async () => {
    rota('GET', '/sip/usuario', ramalAdmin())
    rota('DELETE', '/sip/usuario', {})
    await abrir()
    const noDialogo = (texto: string) => [...document.body.querySelectorAll('[role="alertdialog"] button')].find((b) => b.textContent?.trim() === texto) as HTMLButtonElement
    await botao('Excluir ramal').trigger('click')
    await aguardar(5)
    expect(document.body.textContent).toContain('Excluir o ramal de Ana?')
    noDialogo('Cancelar').click()
    await aguardar(10)
    expect(pedidosDe('DELETE', '/sip/usuario')).toHaveLength(0)
    await botao('Excluir ramal').trigger('click')
    await aguardar(5)
    noDialogo('Excluir').click()
    await aguardar(10)
    expect(pedidosDe('DELETE', '/sip/usuario')[0]!.consulta).toEqual({ usuario_id: '2' })
    expect(tela!.text()).toContain('Ramal excluído.')
    expect(tela!.text()).toContain('Criar ramal')
    expect((campo('Ramal').element as HTMLInputElement).value).toBe('')
  })

  test('mexer no próprio ramal registra de novo neste navegador', async () => {
    instalarWebrtcFalso()
    const relogio = relogioFalso()
    try {
      rota('GET', '/sip/usuario', ramalAdmin({ usuario_id: EU }))
      rota('PUT', '/sip/usuario', ramalAdmin({ usuario_id: EU }))
      rota('GET', '/sip', { ...ramalAdmin({ usuario_id: EU }), sip_password: 'senha', turn_password: null })
      await abrir({ id: EU, nome: 'Eu Mesmo' })
      await tela!.find('form').trigger('submit')
      await relogio.rodar(aguardar(10))
      await relogio.rodar(aguardar(10))
      expect(pedidosDe('GET', '/sip')).toHaveLength(1)
      expect(sipCriados.agentes.at(-1)!.opcoes.uri).toBe('sip:9996@voip.igerp.com')
      expect(useSipStore().isRegistered).toBe(true)
    } finally {
      relogio.restaurar()
    }
  })

  test('ramal de outra pessoa não mexe no registro deste navegador', async () => {
    rota('GET', '/sip/usuario', ramalAdmin())
    rota('PUT', '/sip/usuario', ramalAdmin())
    await abrir()
    await enviar()
    expect(pedidosDe('GET', '/sip')).toHaveLength(0)
  })
})

describe('Voip (o próprio ramal), só leitura', () => {
  test('mostra o ramal e o estado, sem campos para editar', async () => {
    rota('GET', '/sip', { ...ramalAdmin({ usuario_id: EU, display_name: 'Ramal da Recepção' }), sip_password: 'senha', turn_password: null })
    tela = mount(ConfiguracaoVoip, { attachTo: document.body })
    await aguardar(10)
    expect(tela.findAll('input')).toHaveLength(0)
    expect(tela.text()).toContain('Configurado pelo administrador')
    expect(tela.text()).toContain('9996')
    expect(tela.text()).toContain('Ramal da Recepção')
    expect(tela.text()).toContain('wss://voip.igerp.com:8089/ws')
    expect(tela.text()).toContain('Somente STUN')
    expect(tela.text()).toContain('Não registrado')
    expect(tela.text()).not.toContain('senha')
  })

  test('sem ramal, pede ao administrador', async () => {
    rota('GET', '/sip', {})
    tela = mount(ConfiguracaoVoip, { attachTo: document.body })
    await aguardar(10)
    expect(tela.text()).toContain('Peça ao administrador')
    expect(tela.text()).toContain('Sem ramal')
    expect(tela.text()).not.toContain('Reconectar')
  })

  test('com TURN, mostra o servidor; ramal desativado não oferece reconectar', async () => {
    rota('GET', '/sip', { ...ramalAdmin({ usuario_id: EU, ativo: false, turn_server: 'turns:voip.igerp.com:443' }), sip_password: 'x' })
    tela = mount(ConfiguracaoVoip, { attachTo: document.body })
    await aguardar(10)
    expect(tela.text()).toContain('STUN e TURN (turns:voip.igerp.com:443)')
    expect(tela.text()).toContain('Desativado')
    expect(tela.text()).not.toContain('Reconectar')
  })

  test('Reconectar registra de novo e mostra Registrado', async () => {
    instalarWebrtcFalso()
    const relogio = relogioFalso()
    try {
      rota('GET', '/sip', { ...ramalAdmin({ usuario_id: EU }), sip_password: 'senha' })
      tela = mount(ConfiguracaoVoip, { attachTo: document.body })
      await relogio.rodar(aguardar(10))
      await botao('Reconectar').trigger('click')
      await relogio.rodar(aguardar(10))
      await relogio.rodar(aguardar(10))
      expect(tela.text()).toContain('Registrado')
    } finally {
      relogio.restaurar()
    }
  })

  test('nas Configurações, a aba Voip não tem mais o formulário nem salva nada', async () => {
    rota('GET', '/usuario/permissoes', ['telefonia', 'config_chamadas'])
    rota('GET', '/sip', {})
    await useAuthStore().carregarPermissoes()
    tela = mount(ProfileSettingsModal, { props: { aberta: true, inline: true, abaAtiva: 'voip' }, attachTo: document.body })
    await aguardar(10)
    expect(tela.text()).toContain('Ramal SIP')
    expect(tela.text()).not.toContain('Criar configuracao SIP')
    expect(pedidos.filter((p) => p.caminho.startsWith('/sip') && p.metodo !== 'GET')).toHaveLength(0)
  })
})
