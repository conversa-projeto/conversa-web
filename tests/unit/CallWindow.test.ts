import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CallWindow from '@/CallWindow.vue'
import { useCallStore, type PeerConexao } from '@/stores/call'
import { TipoChamada } from '@/types/api'
import { instalarWebrtcFalso } from './webrtcFalso'

const ANA = 2
const BRUNO = 3

function participante(usuarioId: number, usuarioNome: string): PeerConexao {
  return { usuarioId, usuarioNome, txPc: null, rxPc: null, stream: null }
}

let janela: VueWrapper
let call: ReturnType<typeof useCallStore>

function emChamadaDeVideo(peers: PeerConexao[] = []) {
  call.estado = 'ativa'
  call.tipoChamada = TipoChamada.Video
  call.chamada = { id: 1, tipo: 2, status: 3, iniciada: null, finalizada: null, criado_em: new Date(), criado_por: ANA, usuarios: [] } as never
  call.peers = new Map(peers.map((p) => [p.usuarioId, p]))
}

// Modo ativo pelo botão destacado no cabeçalho
function modoAtivo() {
  const ativo = janela.findAll('button[title]').find((b) => b.classes().includes('bg-chamada-500'))
  return ({ 'Todos os participantes lado a lado': 'grade', 'Um participante grande e os demais na lateral': 'destaque', 'Só um participante, ocupando toda a área': 'unica' } as Record<string, string>)[ativo?.attributes('title') ?? '']
}

async function montar(peers: PeerConexao[] = []) {
  emChamadaDeVideo(peers)
  janela = mount(CallWindow, { props: { fecharAoEncerrar: false }, attachTo: document.body })
  await flushPromises()
}

beforeEach(() => {
  instalarWebrtcFalso()
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu' }))
  setActivePinia(createPinia())
  call = useCallStore()
})
afterEach(() => janela?.unmount())

describe('modo de exibição da chamada', () => {
  test('começa em grade, e o cabeçalho mostra quantas pessoas', async () => {
    await montar([participante(ANA, 'Ana')])
    expect(modoAtivo()).toBe('grade')
    expect(janela.text()).toContain('2 pessoas')
  })

  test('pedido de tela única aplica no participante pedido e é consumido', async () => {
    await montar([participante(ANA, 'Ana'), participante(BRUNO, 'Bruno')])
    call.telaUnicaSolicitada = BRUNO
    await flushPromises()
    expect(modoAtivo()).toBe('unica')
    expect(call.telaUnicaSolicitada).toBeNull()
    expect(janela.text()).toContain('Bruno')
  })

  test('sem ninguém conectado ainda, o pedido espera o primeiro chegar', async () => {
    await montar([])
    call.telaUnicaSolicitada = ANA
    await flushPromises()
    expect(modoAtivo()).toBe('grade')
    expect(call.telaUnicaSolicitada).toBe(ANA)
    call.peers = new Map([[ANA, participante(ANA, 'Ana')]])
    await flushPromises()
    expect(modoAtivo()).toBe('unica')
  })

  test('pedido feito antes de a janela abrir vale ao abrir', async () => {
    call.telaUnicaSolicitada = ANA
    await montar([participante(ANA, 'Ana')])
    expect(modoAtivo()).toBe('unica')
  })

  test('participante pedido fora da chamada: usa o primeiro que estiver', async () => {
    await montar([participante(BRUNO, 'Bruno')])
    call.telaUnicaSolicitada = 0
    await flushPromises()
    expect(modoAtivo()).toBe('unica')
  })

  test('a conexão cai e volta logo depois de atender: a tela única se mantém', async () => {
    await montar([participante(ANA, 'Ana')])
    call.telaUnicaSolicitada = ANA
    await flushPromises()
    call.peers = new Map()
    await flushPromises()
    call.peers = new Map([[ANA, participante(ANA, 'Ana')]])
    await flushPromises()
    expect(modoAtivo()).toBe('unica')
  })

  test('escolher outro modo na mão cancela o pedido pendente', async () => {
    await montar([participante(ANA, 'Ana')])
    call.telaUnicaSolicitada = ANA
    await flushPromises()
    call.peers = new Map()
    await flushPromises()
    await janela.find('button[title="Todos os participantes lado a lado"]').trigger('click')
    call.peers = new Map([[ANA, participante(ANA, 'Ana')]])
    await flushPromises()
    expect(modoAtivo()).toBe('grade')
    expect(call.telaUnicaSolicitada).toBeNull()
  })

  test('trocar de modo pelos botões', async () => {
    await montar([participante(ANA, 'Ana')])
    await janela.find('button[title="Um participante grande e os demais na lateral"]').trigger('click')
    expect(modoAtivo()).toBe('destaque')
    await janela.find('button[title="Só um participante, ocupando toda a área"]').trigger('click')
    expect(modoAtivo()).toBe('unica')
    await janela.find('button[title="Todos os participantes lado a lado"]').trigger('click')
    expect(modoAtivo()).toBe('grade')
  })

  test('em destaque, se o participante em foco sai de vez, volta para a grade', async () => {
    await montar([participante(ANA, 'Ana'), participante(BRUNO, 'Bruno')])
    await janela.find('button[title="Um participante grande e os demais na lateral"]').trigger('click')
    call.peers = new Map([[BRUNO, participante(BRUNO, 'Bruno')]])
    await flushPromises()
    expect(modoAtivo()).toBe('grade')
  })

  test('chamada de áudio não mostra os modos', async () => {
    await montar([participante(ANA, 'Ana')])
    call.tipoChamada = TipoChamada.Audio
    await flushPromises()
    expect(modoAtivo()).toBeUndefined()
  })
})
