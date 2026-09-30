import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ChatPopup from '@/components/ChatPopup.vue'
import MessageList from '@/components/MessageList.vue'
import ChatHeader from '@/components/ChatHeader.vue'
import ImageViewerModal from '@/components/ImageViewerModal.vue'
import ForwardMessageModal from '@/components/ForwardMessageModal.vue'
import { useChatStore } from '@/stores/chat'
import { TipoConteudo, TipoConversa, type Contato, type Mensagem } from '@/types/api'
import { aguardar, erro, rota } from './apiFalsa'
import { instalarWebrtcFalso } from './webrtcFalso'

class ObservadorFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let tela: VueWrapper | undefined
const rolagemOriginal = Element.prototype.scrollIntoView

beforeEach(() => {
  instalarWebrtcFalso()
  localStorage.setItem('conversa.token', 'token')
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu' }))
  setActivePinia(createPinia())
  globalThis.ResizeObserver = ObservadorFalso as never
  Element.prototype.scrollIntoView = () => {}
})
afterEach(() => {
  tela?.unmount()
  tela = undefined
  // Socket e consulta periódica abertos pelo chat
  useChatStore().encerrarTempoReal()
  Element.prototype.scrollIntoView = rolagemOriginal
  document.body.innerHTML = ''
})

// URL assinada como a do MinIO: sem a assinatura, o app acha que venceu e busca de novo
const assinadaEm = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
const urlAssinada = `https://localhost/storage/img-1?X-Amz-Date=${assinadaEm}&X-Amz-Expires=600`

const mensagemApi = (id: number, conteudos: object[]) => ({ id, remetente_id: 2, remetente: 'Bruno', conversa_id: 1, inserida: new Date(2026, 2, 1).toISOString(), alterada: null, visivel_em: null, recebida: true, visualizada: true, reproduzida: false, conteudos })

async function abrir(conversaId = 1) {
  rota('GET', '/usuario/contatos', [{ id: 2, nome: 'Bruno', login: 'bruno', email: 'b@t' }])
  rota('GET', '/anexo', { url: urlAssinada })
  rota('GET', '/conversas', [{ id: 1, descricao: 'Bruno', tipo: TipoConversa.Direta, destinatario_id: 2, inserida: new Date().toISOString() }, { id: 2, descricao: 'Equipe', tipo: TipoConversa.Grupo, inserida: new Date().toISOString() }])
  rota('GET', '/mensagens', [
    mensagemApi(10, [{ ordem: 1, tipo: TipoConteudo.Imagem, conteudo: 'img-1', nome: 'praia.png' }, { ordem: 2, tipo: TipoConteudo.Texto, conteudo: ' Olha a praia ' }]),
    mensagemApi(11, [{ ordem: 1, tipo: TipoConteudo.Texto, conteudo: 'bonita' }]),
  ])
  tela = mount(ChatPopup, { props: { conversaId }, attachTo: document.body })
  await aguardar(30)
  return tela
}

describe('janela de conversa separada', () => {
  test('carrega a conversa pedida, com o título da janela no nome dela', async () => {
    await abrir()
    expect(tela!.text()).not.toContain('Carregando conversa...')
    expect(document.title).toBe('Bruno')
    expect(tela!.findComponent(ChatHeader).props('popout')).toBe(true)
    expect(tela!.findComponent(MessageList).exists()).toBe(true)
    expect(useChatStore().conversaAtivaId).toBe(1)
  })

  test('sem login avisa que a sessão expirou', async () => {
    localStorage.removeItem('conversa.token')
    setActivePinia(createPinia())
    tela = mount(ChatPopup, { props: { conversaId: 1 }, attachTo: document.body })
    await flushPromises()
    expect(tela.text()).toContain('Sessao expirada. Faca login novamente.')
    await tela.find('button').trigger('click')
    expect(tela.text()).not.toContain('Sessao expirada')
  })

  test('conversa que não é da pessoa', async () => {
    await abrir(99)
    expect(tela!.text()).toContain('Conversa nao encontrada.')
  })

  test('erro ao carregar aparece', async () => {
    rota('GET', '/usuario/contatos', erro(500, 'Servidor fora do ar'))
    rota('GET', '/conversas', [])
    tela = mount(ChatPopup, { props: { conversaId: 1 }, attachTo: document.body })
    await aguardar(30)
    expect(tela.text()).toContain('Servidor fora do ar')
  })

  test('abrir imagem mostra a galeria das imagens da conversa, com o texto junto', async () => {
    rota('GET', '/anexo', { url: urlAssinada })
    await abrir()
    tela!.findComponent(MessageList).vm.$emit('open-image', 'img-1', 'praia.png')
    await aguardar(20)
    const visualizador = tela!.findComponent(ImageViewerModal)
    expect(visualizador.props('aberta')).toBe(true)
    expect(visualizador.props('galeria')).toEqual([{ identificador: 'img-1', nome: 'praia.png', legenda: 'Olha a praia' }])
    visualizador.vm.$emit('close')
    await flushPromises()
    expect(tela!.findComponent(ImageViewerModal).props('aberta')).toBe(false)
  })

  test('encaminhar: para conversa ou contato; erro aparece e o modal fica', async () => {
    await abrir()
    const chat = useChatStore()
    const encaminhadas: [number, number | string][] = []
    chat.encaminharMensagemParaConversa = (async (m: Mensagem, conversaId: number) => void encaminhadas.push([m.id, conversaId])) as never
    chat.encaminharMensagemParaContato = (async (m: Mensagem, contato: Contato) => { if (contato.id === 99) throw new Error('Contato bloqueado'); encaminhadas.push([m.id, contato.nome]) }) as never
    const lista = tela!.findComponent(MessageList)
    const modal = () => tela!.findComponent(ForwardMessageModal)
    lista.vm.$emit('forward', chat.mensagensAtivas[1])
    await flushPromises()
    expect(modal().props('aberta')).toBe(true)
    modal().vm.$emit('select-conversation', 2)
    await flushPromises()
    expect(modal().props('aberta')).toBe(false)
    lista.vm.$emit('forward', chat.mensagensAtivas[1])
    await flushPromises()
    modal().vm.$emit('select-contact', { id: 3, nome: 'Carla' })
    await flushPromises()
    lista.vm.$emit('forward', chat.mensagensAtivas[1])
    await flushPromises()
    modal().vm.$emit('select-contact', { id: 99, nome: 'X' })
    await flushPromises()
    expect(encaminhadas).toEqual([[11, 2], [11, 'Carla']])
    expect(tela!.text()).toContain('Contato bloqueado')
    expect(modal().props('aberta')).toBe(true)
    modal().vm.$emit('close')
    await flushPromises()
    expect(modal().props('aberta')).toBe(false)
  })
})
