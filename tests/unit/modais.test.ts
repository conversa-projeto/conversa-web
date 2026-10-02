import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { EditorView } from '@codemirror/view'
import CreateGroupModal from '@/components/CreateGroupModal.vue'
import ForwardMessageModal from '@/components/ForwardMessageModal.vue'
import GroupMembersModal from '@/components/GroupMembersModal.vue'
import UserInfoModal from '@/components/UserInfoModal.vue'
import AddUserToCallModal from '@/components/AddUserToCallModal.vue'
import CallParticipantsModal from '@/components/CallParticipantsModal.vue'
import VideoUpgradeModal from '@/components/VideoUpgradeModal.vue'
import SipIncomingCallModal from '@/components/SipIncomingCallModal.vue'
import SipDialerModal from '@/components/SipDialerModal.vue'
import ImagePreviewModal from '@/components/ImagePreviewModal.vue'
import CodigoModal from '@/components/CodigoModal.vue'
import DialogoConfirmacao from '@/components/DialogoConfirmacao.vue'
import { useDialogo } from '@/composables/useDialogo'
import { defineComponent, h, nextTick } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useCallStore } from '@/stores/call'
import { useSipStore } from '@/stores/sip'
import { TipoConversa, type Contato, type Conversa } from '@/types/api'
import { aguardar, erro, pedidosDe, rota } from './apiFalsa'
import { mensagem, texto } from './fabrica'
import { relogioFalso } from './relogioFalso'
import { SessionState, sipCriados } from './sipFalso'
import { instalarWebrtcFalso } from './webrtcFalso'

const montados: VueWrapper[] = []
function montar<T>(componente: T, opcoes: object = {}) {
  const w = mount(componente as never, { attachTo: document.body, ...opcoes }) as unknown as VueWrapper
  montados.push(w)
  return w
}
// setValue no <select> do happy-dom não acha a opção: marca e avisa a mudança
async function escolher(tela: VueWrapper, opcao: string) {
  ;(tela.findAll('option').find((o) => o.text() === opcao)!.element as HTMLOptionElement).selected = true
  await tela.find('select').trigger('change')
}
const botao = (tela: VueWrapper, textoBotao: string) => tela.findAll('button').find((b) => b.text() === textoBotao)!
const contato = (id: number, nome: string, extras: Partial<Contato> = {}): Contato => ({ id, nome, login: nome.toLowerCase(), email: `${nome.toLowerCase()}@teste.test`, ...extras } as Contato)
const conversa = (id: number, extras: Partial<Conversa> = {}): Conversa => ({ id, descricao: `Conversa ${id}`, tipo: TipoConversa.Direta, inserida: new Date(), ...extras } as Conversa)

beforeEach(() => {
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu' }))
  setActivePinia(createPinia())
})
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

describe('criar grupo', () => {
  function montarModal() {
    const chat = useChatStore()
    chat.contatos = [contato(2, 'Bruno'), contato(3, 'Carla', { email: 'carla@empresa.com' }), contato(7, 'Eu')]
    chat.conversas = [conversa(10, { destinatario_id: 2, avatar_url: 'https://localhost/storage/bruno' })]
    return montar(CreateGroupModal, { props: { aberta: true } })
  }

  test('lista os contatos com a foto da conversa direta; filtra por nome, login ou e-mail', async () => {
    const tela = montarModal()
    expect(tela.findAll('label.cursor-pointer')).toHaveLength(3)
    expect(tela.find('img[src="https://localhost/storage/bruno"]').exists()).toBe(true)
    await tela.find('input[placeholder="Filtrar contatos"]').setValue('empresa')
    expect(tela.findAll('label.cursor-pointer').map((l) => l.find('span').text())).toEqual(['Carla'])
    await tela.find('input[placeholder="Filtrar contatos"]').setValue('ninguém')
    expect(tela.text()).toContain('Nenhum contato encontrado.')
  })

  test('sem nome ou sem membros não cria', async () => {
    const tela = montarModal()
    await botao(tela, 'Criar').trigger('click')
    expect(tela.text()).toContain('Informe o nome do grupo.')
    await tela.find('input[placeholder="Ex: Projeto Alpha"]').setValue('Projeto')
    await botao(tela, 'Criar').trigger('click')
    expect(tela.text()).toContain('Selecione ao menos um usuário.')
    expect(pedidosDe('PUT', '/conversa')).toHaveLength(0)
  })

  test('cria o grupo com quem criou e os escolhidos, e fecha', async () => {
    rota('PUT', '/conversa', { id: 20 })
    rota('PUT', '/conversa/usuario', { id: 1 })
    rota('GET', '/conversas', [])
    rota('GET', '/mensagens', [])
    const tela = montarModal()
    await tela.find('input[placeholder="Ex: Projeto Alpha"]').setValue('  Projeto  ')
    await tela.findAll('input[type="checkbox"]')[1]!.setValue(true)
    await botao(tela, 'Criar').trigger('click')
    await aguardar(10)
    expect(pedidosDe('PUT', '/conversa')[0]!.corpo).toEqual({ descricao: 'Projeto', tipo: TipoConversa.Grupo })
    expect(pedidosDe('PUT', '/conversa/usuario').map((p) => p.corpo.usuario_id).sort()).toEqual([3, 7])
    expect(tela.emitted('close')).toHaveLength(1)
    expect(tela.emitted('created')).toHaveLength(1)
  })

  test('erro do servidor aparece e o modal fica aberto', async () => {
    rota('PUT', '/conversa', erro(400, 'Nome inválido'))
    const tela = montarModal()
    await tela.find('input[placeholder="Ex: Projeto Alpha"]').setValue('X')
    await tela.findAll('input[type="checkbox"]')[0]!.setValue(true)
    await botao(tela, 'Criar').trigger('click')
    await aguardar(10)
    expect(tela.text()).toContain('Nome inválido')
    expect(tela.emitted('close')).toBeUndefined()
  })

  test('Cancelar e Esc fecham e limpam o que foi digitado', async () => {
    const tela = montarModal()
    await tela.find('input[placeholder="Ex: Projeto Alpha"]').setValue('Rascunho')
    await botao(tela, 'Cancelar').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(tela.emitted('close')).toHaveLength(2)
    expect((tela.find('input[placeholder="Ex: Projeto Alpha"]').element as HTMLInputElement).value).toBe('')
  })
})

describe('encaminhar', () => {
  function montarModal() {
    const chat = useChatStore()
    chat.conversas = [
      conversa(1),
      conversa(2, { tipo: TipoConversa.Grupo, descricao: 'Equipe' }),
      conversa(3, { nome: 'Bruno', destinatario_id: 2 }),
    ]
    chat.contatos = [contato(2, 'Bruno'), contato(4, 'Davi')]
    return montar(ForwardMessageModal, { props: { aberta: true, mensagem: mensagem({ conversa_id: 1, conteudos: [texto('Olá a todos')] }) } })
  }

  test('mostra a mensagem e os destinos, menos a conversa de origem e contatos que já têm conversa', () => {
    const tela = montarModal()
    expect(tela.text()).toContain('Olá a todos')
    const destinos = tela.findAll('.max-h-\\[360px\\] button').map((b) => b.find('p').text())
    expect(destinos).toEqual(['Equipe', 'Bruno', 'Davi'])
  })

  test('busca filtra; conversa e contato emitem eventos diferentes', async () => {
    const tela = montarModal()
    await tela.find('input').setValue('grupo')
    expect(tela.findAll('.max-h-\\[360px\\] button')).toHaveLength(1)
    await tela.find('.max-h-\\[360px\\] button').trigger('click')
    expect(tela.emitted('select-conversation')).toEqual([[2]])
    await tela.find('input').setValue('davi')
    await tela.find('.max-h-\\[360px\\] button').trigger('click')
    expect((tela.emitted('select-contact') as [[Contato]])[0]![0].id).toBe(4)
    await tela.find('input').setValue('zzz')
    expect(tela.text()).toContain('Nenhum destino encontrado.')
  })

  test('fechar limpa a busca', async () => {
    const tela = montarModal()
    await tela.find('input').setValue('davi')
    await tela.find('button').trigger('click')
    expect(tela.emitted('close')).toHaveLength(1)
    await tela.setProps({ aberta: false })
    await tela.setProps({ aberta: true })
    expect((tela.find('input').element as HTMLInputElement).value).toBe('')
  })
})

describe('membros do grupo', () => {
  const membros = [{ id: 100, usuario_id: 7, nome: 'Eu' }, { id: 101, usuario_id: 2, nome: 'Bruno' }]

  async function montarModal() {
    rota('GET', '/conversa/usuarios', membros)
    const chat = useChatStore()
    chat.contatos = [contato(2, 'Bruno'), contato(3, 'Carla')]
    chat.conversas = [conversa(5, { tipo: TipoConversa.Grupo, descricao: 'Equipe' })]
    chat.conversaAtivaId = 5
    const tela = montar(GroupMembersModal, { props: { aberta: true } })
    await aguardar(10)
    return tela
  }

  test('lista os membros; não dá para remover a si mesmo; só oferece quem não está', async () => {
    const tela = await montarModal()
    expect(pedidosDe('GET', '/conversa/usuarios')[0]!.consulta).toEqual({ conversa: '5' })
    expect(tela.text()).toContain('Eu')
    expect(tela.findAll('button').filter((b) => b.text() === 'Remover')).toHaveLength(1)
    expect(tela.findAll('option').map((o) => o.text())).toEqual(['Selecionar usuario', 'Carla'])
  })

  test('renomear só quando o nome muda', async () => {
    rota('PATCH', '/conversa', {})
    rota('GET', '/conversas', [conversa(5, { tipo: TipoConversa.Grupo, descricao: 'Time' })])
    const tela = await montarModal()
    expect(botao(tela, 'Renomear').attributes('disabled')).toBeDefined()
    await tela.find('input[type="text"]').setValue('Time')
    await botao(tela, 'Renomear').trigger('click')
    await aguardar(10)
    expect(pedidosDe('PATCH', '/conversa')[0]!.corpo).toEqual({ id: 5, descricao: 'Time' })
    expect(tela.text()).toContain('Grupo renomeado com sucesso.')
  })

  test('adicionar e remover recarregam os membros', async () => {
    rota('PUT', '/conversa/usuario', { id: 102 })
    rota('DELETE', '/conversa/usuario', {})
    const tela = await montarModal()
    await escolher(tela, 'Carla')
    await botao(tela, 'Adicionar').trigger('click')
    await aguardar(10)
    expect(pedidosDe('PUT', '/conversa/usuario')[0]!.corpo).toEqual({ conversa_id: 5, usuario_id: 3 })
    expect(tela.text()).toContain('Participante adicionado com sucesso.')
    await botao(tela, 'Remover').trigger('click')
    await aguardar(10)
    expect(pedidosDe('DELETE', '/conversa/usuario')[0]!.consulta).toEqual({ id: '101' })
    expect(tela.text()).toContain('Participante removido com sucesso.')
    expect(pedidosDe('GET', '/conversa/usuarios').length).toBeGreaterThanOrEqual(3)
  })

  test('erros do servidor aparecem', async () => {
    rota('PUT', '/conversa/usuario', erro(403, 'Sem permissão'))
    rota('DELETE', '/conversa/usuario', erro(403, 'Não pode remover'))
    rota('PATCH', '/conversa', erro(400, 'Nome ruim'))
    const tela = await montarModal()
    await escolher(tela, 'Carla')
    await botao(tela, 'Adicionar').trigger('click')
    await aguardar(10)
    expect(tela.text()).toContain('Sem permissão')
    await botao(tela, 'Remover').trigger('click')
    await aguardar(10)
    expect(tela.text()).toContain('Não pode remover')
    await tela.find('input[type="text"]').setValue('Outro')
    await botao(tela, 'Renomear').trigger('click')
    await aguardar(10)
    expect(tela.text()).toContain('Nome ruim')
  })

  test('sem membros avisa; Fechar emite', async () => {
    rota('GET', '/conversa/usuarios', [])
    const chat = useChatStore()
    chat.conversas = [conversa(5, { tipo: TipoConversa.Grupo })]
    chat.conversaAtivaId = 5
    const tela = montar(GroupMembersModal, { props: { aberta: true } })
    await aguardar(10)
    expect(tela.text()).toContain('Nenhum membro')
    await botao(tela, 'Fechar').trigger('click')
    expect(tela.emitted('close')).toHaveLength(1)
  })
})

describe('informações do usuário', () => {
  const usuario = { id: 2, nome: 'bruno', email: 'b@t', telefone: null, avatar_url: 'https://localhost/storage/b' }

  test('mostra foto, nome e contatos; sem dado mostra "Nao informado"', () => {
    const tela = montar(UserInfoModal, { props: { aberta: true, usuario } })
    expect(tela.find('img').attributes('src')).toBe('https://localhost/storage/b')
    expect(tela.text()).toContain('b@t')
    expect(tela.text()).toContain('Nao informado')
    expect(tela.text()).not.toContain('Ver anexos')
  })

  test('foto que falha vira a inicial, e volta quando muda o endereço', async () => {
    const tela = montar(UserInfoModal, { props: { aberta: true, usuario } })
    await tela.find('img').trigger('error')
    expect(tela.find('img').exists()).toBe(false)
    expect(tela.text()).toContain('B')
    await tela.setProps({ usuario: { ...usuario, avatar_url: 'https://localhost/storage/nova' } })
    expect(tela.find('img').attributes('src')).toBe('https://localhost/storage/nova')
  })

  test('com conversa, Ver anexos; fechar pelo botão e clicando fora', async () => {
    const tela = montar(UserInfoModal, { props: { aberta: true, usuario, conversaId: 9 } })
    await botao(tela, 'Ver anexos').trigger('click')
    expect(tela.emitted('open-anexos')).toEqual([[9]])
    await tela.find('button[title="Fechar"]').trigger('click')
    await tela.find('div.fixed').trigger('click')
    expect(tela.emitted('close')).toHaveLength(2)
  })
})

describe('chamadas', () => {
  test('participantes: escolhe e inicia; cancelar limpa a escolha', async () => {
    useChatStore().contatos = [contato(2, 'Bruno'), contato(3, 'Carla')]
    const tela = montar(CallParticipantsModal, { props: { aberta: true, tipoChamada: 2 } })
    expect(tela.text()).toContain('Chamada de vídeo')
    expect(botao(tela, 'Iniciar chamada').attributes('disabled')).toBeDefined()
    await tela.findAll('input[type="checkbox"]')[1]!.setValue(true)
    await botao(tela, 'Iniciar chamada').trigger('click')
    expect(tela.emitted('confirm')).toEqual([[[3]]])
    await tela.findAll('input[type="checkbox"]')[0]!.setValue(true)
    await botao(tela, 'Cancelar').trigger('click')
    expect(tela.emitted('close')).toHaveLength(1)
    expect(tela.findAll('input:checked')).toHaveLength(0)
    await tela.setProps({ tipoChamada: 1 })
    expect(tela.text()).toContain('Chamada de voz')
  })

  test('adicionar à chamada: um pedido por pessoa e fecha', async () => {
    instalarWebrtcFalso()
    useChatStore().contatos = [contato(2, 'Bruno'), contato(3, 'Carla')]
    const call = useCallStore()
    // spyOn não alcança a ação da store: troca direto
    const adicionar = mock(async (_id: number) => {})
    call.adicionarUsuario = adicionar
    const tela = montar(AddUserToCallModal, { props: { aberta: true } })
    for (const caixa of tela.findAll('input[type="checkbox"]')) await caixa.setValue(true)
    await botao(tela, 'Adicionar').trigger('click')
    await aguardar()
    expect(adicionar.mock.calls).toEqual([[2], [3]])
    expect(tela.emitted('close')).toHaveLength(1)
    await botao(tela, 'Cancelar').trigger('click')
    expect(tela.emitted('close')).toHaveLength(2)
  })

  test('adicionar à chamada sem ninguém disponível', () => {
    instalarWebrtcFalso()
    expect(montar(AddUserToCallModal, { props: { aberta: true } }).text()).toContain('Nenhum contato disponível para adicionar.')
  })

  test('vídeo ativado por outra pessoa: assistir ou transmitir também', async () => {
    instalarWebrtcFalso()
    const call = useCallStore()
    const responder = mock(async (_transmitir: boolean) => {})
    call.responderUpgradeVideo = responder
    const tela = montar(VideoUpgradeModal)
    expect(tela.text()).toBe('')
    call.videoAtivadoPor = { usuarioId: 2, usuarioNome: 'Bruno' }
    await tela.vm.$nextTick()
    expect(tela.text()).toContain('Bruno ativou o vídeo')
    await botao(tela, 'Apenas assistir').trigger('click')
    await botao(tela, 'Transmitir também').trigger('click')
    expect(responder.mock.calls).toEqual([[false], [true]])
  })
})

describe('ramal SIP', () => {
  let relogio: ReturnType<typeof relogioFalso>
  const ramal = { id: 1, usuario_id: 7, sip_user: '1001', auth_user: null, sip_password: 's', display_name: 'Eu', domain: 'pbx.teste', ws_server: 'wss://pbx.teste/ws', ativo: true }

  beforeEach(() => {
    instalarWebrtcFalso()
    relogio = relogioFalso()
  })
  afterEach(() => relogio.restaurar())

  async function registrado() {
    rota('GET', '/sip', ramal)
    const sip = useSipStore()
    await relogio.rodar(sip.inicializarSessao())
    return sip
  }

  test('chamada recebida mostra nome e número; atender e recusar', async () => {
    const sip = await registrado()
    const tela = montar(SipIncomingCallModal)
    expect(tela.text()).toBe('')
    const convite = sipCriados.agentes[0]!.receberChamada()
    Object.assign(convite, { remoteIdentity: { displayName: 'Cliente', uri: { user: '5511999' } } })
    // A identidade chega depois do convite: reatribui para a tela ver
    sip.chamadaRecebida = null
    sip.chamadaRecebida = convite as never
    await tela.vm.$nextTick()
    expect(tela.text()).toContain('Cliente')
    expect(tela.text()).toContain('5511999')
    await tela.find('button[title="Atender"]').trigger('click')
    await aguardar()
    expect(convite.chamadas).toContain('accept')
  })

  test('chamada recebida sem nome mostra o número como título; recusar', async () => {
    await registrado()
    const tela = montar(SipIncomingCallModal)
    const convite = Object.assign(sipCriados.agentes[0]!.receberChamada(), { remoteIdentity: { uri: { user: '300' } } })
    const sip = useSipStore()
    sip.chamadaRecebida = null
    sip.chamadaRecebida = convite as never
    await tela.vm.$nextTick()
    expect(tela.find('h3 + p').text()).toBe('300')
    await tela.find('button[title="Recusar"]').trigger('click')
    await aguardar()
    expect(convite.chamadas).toContain('reject')
  })

  test('discador: status, teclas, apagar e ligar', async () => {
    await registrado()
    const tela = montar(SipDialerModal, { props: { aberta: false } })
    await tela.setProps({ aberta: true })
    expect(tela.text()).toContain('1001')
    expect(tela.text()).toContain('Registrado')
    expect(botao(tela, 'Ligar').attributes('disabled')).toBeDefined()
    for (const tecla of ['5', '5', '9']) await tela.findAll('.grid-cols-3 button').find((b) => b.find('span').text() === tecla)!.trigger('click')
    expect((tela.find('input').element as HTMLInputElement).value).toBe('559')
    await tela.find('input + button').trigger('click')
    expect((tela.find('input').element as HTMLInputElement).value).toBe('55')
    await botao(tela, 'Ligar').trigger('click')
    await aguardar()
    expect(sipCriados.chamadas[0]!.destino).toBe('sip:55@pbx.teste')
    expect(tela.text()).toContain('Discando...')
    expect(tela.text()).toContain('sip:55@pbx.teste')
    sipCriados.chamadas[0]!.mudar(SessionState.Established)
    await tela.vm.$nextTick()
    expect(tela.text()).toContain('Chamada em andamento')
  })

  test('em chamada, as teclas vão como DTMF; mudo; encerrar limpa o número', async () => {
    const sip = await registrado()
    const tela = montar(SipDialerModal, { props: { aberta: true } })
    await tela.find('input').setValue('100')
    await botao(tela, 'Ligar').trigger('click')
    await aguardar()
    const chamada = sipCriados.chamadas[0]!
    chamada.mudar(SessionState.Established)
    await tela.vm.$nextTick()
    await tela.findAll('.grid-cols-3 button').find((b) => b.find('span').text() === '#')!.trigger('click')
    expect(chamada.remetente.tons).toEqual(['#'])
    expect((tela.find('input').element as HTMLInputElement).value).toBe('100')
    await tela.find('button.h-9').trigger('click')
    expect(sip.mutado).toBe(true)
    await tela.find('button.h-9').trigger('click')
    expect(sip.mutado).toBe(false)
    await botao(tela, 'Encerrar chamada').trigger('click')
    await aguardar()
    expect(chamada.chamadas).toContain('bye')
    expect((tela.find('input').element as HTMLInputElement).value).toBe('')
  })

  test('cancelar enquanto disca; erro ao discar aparece', async () => {
    await registrado()
    const tela = montar(SipDialerModal, { props: { aberta: true } })
    await tela.find('input').setValue('100')
    await botao(tela, 'Ligar').trigger('click')
    await aguardar()
    await botao(tela, 'Cancelar').trigger('click')
    await aguardar()
    expect(sipCriados.chamadas[0]!.chamadas).toContain('cancel')
    const { comportamentoSip } = await import('./sipFalso')
    comportamentoSip.invitaFalha = true
    await botao(tela, 'Ligar').trigger('click')
    await aguardar()
    expect(tela.text()).toContain('invite recusado')
  })

  test('status sem ramal e fechar', async () => {
    rota('GET', '/sip', {})
    await useSipStore().inicializarSessao()
    const tela = montar(SipDialerModal, { props: { aberta: true } })
    expect(tela.text()).toContain('Sem configuracao')
    expect(tela.text()).toContain('Indisponivel')
    await tela.find('button.h-7').trigger('click')
    expect(tela.emitted('close')).toHaveLength(1)
  })
})

describe('pré-visualização de imagem', () => {
  test('mostra a imagem; Enter envia e Esc cancela só enquanto aberta', async () => {
    const tela = montar(ImagePreviewModal, { props: { aberta: true, url: 'blob:x', nome: 'foto.png' } })
    expect(tela.find('img').attributes('src')).toBe('blob:x')
    expect(tela.text()).toContain('foto.png')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(tela.emitted('confirm')).toHaveLength(1)
    expect(tela.emitted('close')).toHaveLength(1)
    await tela.setProps({ aberta: false })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(tela.emitted('confirm')).toHaveLength(1)
    await tela.setProps({ aberta: true })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(tela.emitted('confirm')).toHaveLength(2)
  })

  test('botões e clique fora', async () => {
    const tela = montar(ImagePreviewModal, { props: { aberta: true, url: 'blob:x', nome: 'foto.png' } })
    await botao(tela, 'Enviar imagem').trigger('click')
    await botao(tela, 'Cancelar').trigger('click')
    await tela.find('div.fixed').trigger('click')
    expect(tela.emitted('confirm')).toHaveLength(1)
    expect(tela.emitted('close')).toHaveLength(2)
  })
})

describe('inserir código', () => {
  function editor(tela: VueWrapper) {
    return EditorView.findFromDOM(tela.find('.cm-editor').element as HTMLElement)!
  }

  test('Enviar só com código; emite a linguagem escolhida e o texto', async () => {
    const tela = montar(CodigoModal)
    expect(botao(tela, 'Enviar').attributes('disabled')).toBeDefined()
    await tela.find('select').setValue('sql')
    const view = editor(tela)
    view.dispatch({ changes: { from: 0, insert: 'select 1' } })
    await tela.vm.$nextTick()
    await botao(tela, 'Enviar').trigger('click')
    expect(tela.emitted('inserir')).toEqual([[{ linguagem: 'sql', codigo: 'select 1' }]])
  })

  test('só espaços não envia', async () => {
    const tela = montar(CodigoModal)
    editor(tela).dispatch({ changes: { from: 0, insert: '   ' } })
    await tela.vm.$nextTick()
    expect(botao(tela, 'Enviar').attributes('disabled')).toBeDefined()
  })

  test('todas as linguagens da lista trocam o editor sem erro', async () => {
    const tela = montar(CodigoModal)
    const linguagens = tela.findAll('option').map((o) => o.text())
    expect(linguagens).toContain('mermaid')
    for (const linguagem of linguagens) await tela.find('select').setValue(linguagem)
    expect(tela.find('.cm-editor').exists()).toBe(true)
  })

  test('Cancelar e clique fora fecham', async () => {
    const tela = montar(CodigoModal)
    await botao(tela, 'Cancelar').trigger('click')
    await tela.find('div.fixed').trigger('click')
    expect(tela.emitted('close')).toHaveLength(2)
  })
})

describe('diálogo de confirmação do app', () => {
  // O diálogo de verdade com o composable, como a lista de mensagens usa
  function montarDialogo() {
    const dialogo = useDialogo()
    const Tela = defineComponent({ setup: () => () => h(DialogoConfirmacao, { dialogo: dialogo.aberto.value, onResponder: dialogo.responderDialogo }) })
    montar(Tela)
    return dialogo
  }
  const aberto = () => document.querySelector('[role="alertdialog"]')
  const botoes = () => [...aberto()!.querySelectorAll('button')]
  const clicar = (texto: string) => botoes().find((b) => b.textContent!.trim() === texto)!.click()

  test('confirmar: título, texto e botões; o principal responde sim e fecha', async () => {
    const dialogo = montarDialogo()
    const resposta = dialogo.confirmar({ titulo: 'Excluir mensagem', mensagem: 'Ela continua na conversa.', textoConfirmar: 'Excluir', perigo: true })
    await nextTick()
    expect(aberto()!.textContent).toContain('Excluir mensagem')
    expect(aberto()!.textContent).toContain('Ela continua na conversa.')
    expect(botoes().map((b) => b.textContent!.trim())).toEqual(['Cancelar', 'Excluir'])
    expect(botoes()[1]!.className).toContain('bg-danger-600')
    clicar('Excluir')
    expect(await resposta).toBe(true)
    await nextTick()
    expect(aberto()).toBeNull()
  })

  test('ação destrutiva começa com o foco em Cancelar; comum, no botão principal', async () => {
    const dialogo = montarDialogo()
    void dialogo.confirmar({ titulo: 'x', mensagem: 'y', perigo: true })
    await nextTick(); await nextTick()
    expect(document.activeElement!.textContent!.trim()).toBe('Cancelar')
    dialogo.responderDialogo(false)
    void dialogo.confirmar({ titulo: 'x', mensagem: 'y', textoConfirmar: 'Seguir' })
    await nextTick(); await nextTick()
    expect(document.activeElement!.textContent!.trim()).toBe('Seguir')
  })

  test('Cancelar, Esc e clique fora respondem não', async () => {
    const dialogo = montarDialogo()
    for (const desistir of [
      () => clicar('Cancelar'),
      () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
      () => (document.querySelector('.fixed.inset-0') as HTMLElement).click(),
    ]) {
      const resposta = dialogo.confirmar({ titulo: 'x', mensagem: 'y' })
      await nextTick()
      desistir()
      expect(await resposta).toBe(false)
      await nextTick()
      expect(aberto()).toBeNull()
    }
    // Esc com o diálogo fechado não faz nada
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  })

  test('aviso só tem OK; outro diálogo aberto por cima responde não ao anterior', async () => {
    const dialogo = montarDialogo()
    const primeiro = dialogo.confirmar({ titulo: 'Primeiro', mensagem: 'a' })
    const aviso = dialogo.avisar({ titulo: 'Erro', mensagem: 'Falhou' })
    expect(await primeiro).toBe(false)
    await nextTick()
    expect(botoes().map((b) => b.textContent!.trim())).toEqual(['OK'])
    expect(aberto()!.textContent).toContain('Falhou')
    clicar('OK')
    await aviso
    await nextTick()
    expect(aberto()).toBeNull()
  })

  test('texto do botão de desistir pode mudar', async () => {
    const dialogo = montarDialogo()
    void dialogo.confirmar({ titulo: 'x', mensagem: 'y', textoConfirmar: 'Cancelar envio', textoCancelar: 'Voltar' })
    await nextTick()
    expect(botoes().map((b) => b.textContent!.trim())).toEqual(['Voltar', 'Cancelar envio'])
  })
})
