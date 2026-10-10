import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { useCallStore } from '@/stores/call'
import { useChatStore } from '@/stores/chat'
import { useConfigChamada } from '@/composables/useConfigChamada'
import { StatusUsuarioChamada, TipoChamada } from '@/types/api'
import { aguardar, erro, pedidosDe, rota } from './apiFalsa'
import { relogioFalso } from './relogioFalso'
import { aparelhos, audiosTocando, ConexaoFalsa, conexoes, instalarWebrtcFalso, pedidosMidia, TrilhaFalsa } from './webrtcFalso'

const EU = 7
const ANA = 2
const CARLA = 3

let relogio: ReturnType<typeof relogioFalso>

// Chamada 1, de Ana para mim (e quem mais estiver), como a API devolve
function chamadaApi(tipo: TipoChamada, statusMeu: number = StatusUsuarioChamada.Pendente, outros: [number, string, number][] = []) {
  return {
    id: 1, tipo, status: 1, iniciada: null, finalizada: null, criado_em: new Date().toISOString(), criado_por: ANA,
    usuarios: [
      { usuario_id: ANA, usuario_nome: 'Ana', status: StatusUsuarioChamada.Entrou },
      { usuario_id: EU, usuario_nome: 'Eu', status: statusMeu },
      ...outros.map(([usuario_id, usuario_nome, status]) => ({ usuario_id, usuario_nome, status })),
    ],
  }
}

// MediaMTX falso: publicação (WHIP) e assinatura (WHEP) de cada participante
function mediamtx(transmitindo: number[] = [ANA], video = true) {
  rota('GET', '/ice', { iceServers: [], iceTransportPolicy: 'all' })
  rota('POST', `/webrtc/call-1-u-${EU}/whip`, new Response('v=0\r\nm=audio\r\nm=video'))
  for (const id of transmitindo) {
    rota('POST', `/webrtc/call-1-u-${id}/whep`, new Response(video ? 'v=0\r\nm=audio\r\nm=video' : 'v=0\r\nm=audio'))
  }
}

function novaStore() {
  localStorage.setItem('conversa.token', 'token')
  localStorage.setItem('conversa.user', JSON.stringify({ id: EU, nome: 'Eu', login: 'eu' }))
  setActivePinia(createPinia())
  return useCallStore()
}

async function receber(tipo: TipoChamada) {
  const call = novaStore()
  rota('GET', '/chamada/dados', chamadaApi(tipo))
  await call.tratarEventoChamada({ tipo: 51, chamada_id: 1, usuario_id: ANA })
  return call
}

async function atender(call: ReturnType<typeof useCallStore>, apenasAssistir = false, tipo: TipoChamada = call.tipoChamada) {
  rota('POST', '/chamada/entrar', { id: 1 })
  rota('GET', '/chamada/dados', chamadaApi(tipo, StatusUsuarioChamada.Entrou))
  await relogio.rodar(call.aceitarChamada(apenasAssistir))
}

beforeEach(() => {
  instalarWebrtcFalso()
  relogio = relogioFalso()
  useConfigChamada().restaurarPadrao()
})
afterEach(() => {
  // Encerra a chamada e descarta as stores: senão os observadores de um teste
  // (configuração da chamada, por exemplo) continuam agindo nos seguintes
  const pinia = getActivePinia() as unknown as { _s: Map<string, { $dispose: () => void }> } | undefined
  if (pinia?._s.has('call')) useCallStore().encerrarChamada()
  pinia?._s.forEach((store) => store.$dispose())
  relogio.restaurar()
})

describe('receber chamada', () => {
  test('passa a tocar, com quem liga e o tipo', async () => {
    const call = await receber(TipoChamada.Video)
    expect(call.estado).toBe('recebendo')
    expect(call.recebendoChamada).toBe(true)
    expect(call.tipoChamada).toBe(TipoChamada.Video)
    expect(call.chamadaRemetente?.usuario_nome).toBe('Ana')
  })

  test('sem atender em 30 segundos, recusa sozinha', async () => {
    const call = await receber(TipoChamada.Audio)
    rota('POST', '/chamada/recusar', { id: 1 })
    relogio.avancar(29_999)
    expect(call.estado).toBe('recebendo')
    relogio.avancar(1)
    await aguardar()
    // Tocou sem resposta: vira chamada perdida nas atividades
    expect(pedidosDe('POST', '/chamada/recusar').map((p) => p.corpo)).toEqual([{ id: 1, nao_atendeu: true }])
    expect(call.estado).toBe('inativo')
  })

  test('outra chamada enquanto está ocupado é recusada', async () => {
    const call = await receber(TipoChamada.Audio)
    rota('POST', '/chamada/recusar', { id: 9 })
    await call.tratarEventoChamada({ tipo: 51, chamada_id: 9, usuario_id: CARLA })
    expect(pedidosDe('POST', '/chamada/recusar')[0]!.corpo).toEqual({ id: 9, nao_atendeu: true })
    expect(call.chamada?.id).toBe(1)
  })

  test('o aviso da própria chamada que eu fiz é ignorado', async () => {
    const call = novaStore()
    await call.tratarEventoChamada({ tipo: 51, chamada_id: 1, usuario_id: EU })
    expect(call.estado).toBe('inativo')
    expect(pedidosDe('GET', '/chamada/dados')).toHaveLength(0)
  })

  test('recusar avisa a API e para de tocar', async () => {
    const call = await receber(TipoChamada.Audio)
    rota('POST', '/chamada/recusar', { id: 1 })
    await call.recusarChamada()
    expect(pedidosDe('POST', '/chamada/recusar')).toHaveLength(1)
    expect(call.estado).toBe('inativo')
  })

  test('atendida ou recusada em outra aba: esta para de tocar', async () => {
    const call = await receber(TipoChamada.Audio)
    await call.tratarEventoChamada({ tipo: 54, chamada_id: 1, usuario_id: EU })
    expect(call.estado).toBe('inativo')
    const outra = await receber(TipoChamada.Audio)
    await outra.tratarEventoChamada({ tipo: 53, chamada_id: 1, usuario_id: EU })
    expect(outra.estado).toBe('inativo')
  })

  test('chamada pendente recente passa a tocar; antiga (mais de 25 s) é recusada', async () => {
    const call = novaStore()
    rota('GET', '/chamadas/pendentes', [{ id: 1, tipo: 1, status: 1, criado_em: new Date(Date.now() - 5000).toISOString(), criado_por: ANA, conversa_id: 0 }])
    rota('GET', '/chamada/dados', chamadaApi(TipoChamada.Audio))
    await call.verificarChamadasPendentes()
    expect(call.estado).toBe('recebendo')
    call.encerrarChamada()
    rota('GET', '/chamadas/pendentes', [{ id: 5, tipo: 1, status: 1, criado_em: new Date(Date.now() - 60_000).toISOString(), criado_por: ANA, conversa_id: 0 }])
    rota('POST', '/chamada/recusar', { id: 5 })
    await call.verificarChamadasPendentes()
    expect(pedidosDe('POST', '/chamada/recusar')[0]!.corpo).toEqual({ id: 5, nao_atendeu: true })
    expect(call.estado).toBe('inativo')
  })
})

describe('atender', () => {
  test('vídeo com câmera: publica, assina quem liga e não pede tela única', async () => {
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    expect(call.estado).toBe('ativa')
    expect(pedidosMidia[0]).toMatchObject({ audio: expect.any(Object), video: expect.any(Object) })
    expect(pedidosDe('POST', `/webrtc/call-1-u-${EU}/whip`)).toHaveLength(1)
    const ana = call.peers.get(ANA)!
    expect(ana.stream!.getVideoTracks()).toHaveLength(1)
    expect(call.telaUnicaSolicitada).toBeNull()
    expect(call.cameraMutada).toBe(false)
    expect(call.erroMsg).toBe('')
    expect(audiosTocando.map((a) => a.srcObject)).toContain(ana.stream)
  })

  test('desligar o som dos outros silencia quem já está tocando', async () => {
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    call.alternarSaidaAudio()
    expect(audiosTocando.every((a) => a.muted)).toBe(true)
  })

  test('"só assistindo": câmera desligada e tela única em quem ligou', async () => {
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call, true)
    expect(call.cameraMutada).toBe(true)
    expect(call.streamLocal!.getVideoTracks().every((t) => !t.enabled)).toBe(true)
    expect(call.telaUnicaSolicitada).toBe(ANA)
  })

  test('sem câmera: entra só com áudio e pede tela única em quem ligou', async () => {
    aparelhos.camera = false
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    expect(call.streamLocal!.getVideoTracks()).toHaveLength(0)
    expect(call.streamLocal!.getAudioTracks()).toHaveLength(1)
    expect(call.telaUnicaSolicitada).toBe(ANA)
  })

  test('sem câmera nem microfone: só recebe, sem publicar, e pede tela única', async () => {
    aparelhos.camera = false
    aparelhos.microfone = false
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    expect(call.somenteRecepcao).toBe(true)
    expect(pedidosDe('POST', `/webrtc/call-1-u-${EU}/whip`)).toHaveLength(0)
    expect(call.peers.get(ANA)!.stream).not.toBeNull()
    expect(call.telaUnicaSolicitada).toBe(ANA)
  })

  test('o pedido de tela única sai antes de conectar aos outros (que pode demorar)', async () => {
    mediamtx()
    const call = await receber(TipoChamada.Video)
    rota('POST', '/chamada/entrar', { id: 1 })
    // Os dados da chamada só chegam quando o teste libera
    const esperando: (() => void)[] = []
    let liberado = false
    const dados = chamadaApi(TipoChamada.Video, StatusUsuarioChamada.Entrou)
    rota('GET', '/chamada/dados', () => (liberado ? dados : new Promise((r) => esperando.push(() => r(dados)))))
    const atendimento = call.aceitarChamada(true)
    await aguardar(10)
    expect(call.estado).toBe('ativa')
    expect(call.telaUnicaSolicitada).toBe(ANA)
    liberado = true
    esperando.forEach((liberar) => liberar())
    await relogio.rodar(atendimento)
  })

  test('chamada de áudio nunca pede tela única', async () => {
    mediamtx([ANA], false)
    const call = await receber(TipoChamada.Audio)
    await atender(call, true)
    expect(call.telaUnicaSolicitada).toBeNull()
  })

  test('falha ao entrar desfaz tudo e repassa o erro', async () => {
    const call = await receber(TipoChamada.Audio)
    rota('POST', '/chamada/entrar', erro(404, 'Chamada não encontrada!'))
    await expect(call.aceitarChamada()).rejects.toThrow('Chamada não encontrada!')
    expect(call.estado).toBe('inativo')
    expect(call.streamLocal).toBeNull()
  })

  test('assinatura sem transmissão (404) não vira erro na tela e tenta de novo depois', async () => {
    mediamtx([])
    rota('POST', `/webrtc/call-1-u-${ANA}/whep`, new Response('', { status: 404 }))
    const call = await receber(TipoChamada.Audio)
    await atender(call)
    expect(call.erroMsg).toBe('')
    expect(call.peers.get(ANA)!.rxPc).toBeNull()
  })

  test('outro erro na assinatura aparece para o usuário', async () => {
    mediamtx([])
    rota('POST', `/webrtc/call-1-u-${ANA}/whep`, new Response('', { status: 500 }))
    const call = await receber(TipoChamada.Audio)
    await atender(call)
    expect(call.erroMsg).toContain('Erro ao conectar com Ana')
  })
})

describe('durante a chamada', () => {
  async function emChamada(tipo: TipoChamada = TipoChamada.Video) {
    mediamtx()
    const call = await receber(tipo)
    await atender(call)
    return call
  }

  test('microfone, câmera e som dos outros ligam e desligam', async () => {
    const call = await emChamada()
    call.alternarMicrofone()
    expect(call.micMutado).toBe(true)
    expect(call.streamLocal!.getAudioTracks()[0]!.enabled).toBe(false)
    call.alternarCamera()
    expect(call.cameraMutada).toBe(true)
    expect(call.streamLocal!.getVideoTracks()[0]!.enabled).toBe(false)
    call.alternarSaidaAudio()
    expect(call.saidaAudioMutada).toBe(true)
    call.alternarCamera()
    call.alternarMicrofone()
    expect(call.streamLocal!.getTracks().every((t) => t.enabled)).toBe(true)
  })

  test('duração conta os segundos, com horas quando passa de uma', async () => {
    const call = await emChamada()
    const inicial = call.duracaoChamadaFormatada
    expect(inicial).toMatch(/^\d{2}:\d{2}$/)
    relogio.avancar(3600 * 1000)
    expect(call.duracaoChamadaFormatada).toMatch(/^01:00:\d{2}$/)
  })

  test('sair desconecta, libera câmera e microfone e avisa a API', async () => {
    const call = await emChamada()
    rota('POST', '/chamada/sair', { id: 1 })
    const trilhas = call.streamLocal!.getTracks() as unknown as TrilhaFalsa[]
    await call.sairDaChamada()
    expect(pedidosDe('POST', '/chamada/sair')).toHaveLength(1)
    expect(trilhas.every((t) => t.readyState === 'ended')).toBe(true)
    expect(conexoes.every((c) => c.fechada)).toBe(true)
    expect(call.estado).toBe('inativo')
    expect(call.peers.size).toBe(0)
  })

  test('finalizar avisa a API', async () => {
    const call = await emChamada()
    rota('POST', '/chamada/finalizar', { id: 1 })
    await call.finalizarChamada()
    expect(pedidosDe('POST', '/chamada/finalizar')).toHaveLength(1)
    expect(call.estado).toBe('inativo')
  })

  test('aviso de chamada encerrada desliga tudo', async () => {
    const call = await emChamada()
    await call.tratarEventoChamada({ tipo: 52, chamada_id: 1, usuario_id: ANA })
    expect(call.estado).toBe('inativo')
  })

  test('quando o último outro sai, a chamada termina', async () => {
    const call = await emChamada()
    rota('GET', '/chamada/dados', { ...chamadaApi(TipoChamada.Video, StatusUsuarioChamada.Entrou), usuarios: [
      { usuario_id: ANA, usuario_nome: 'Ana', status: StatusUsuarioChamada.Saiu },
      { usuario_id: EU, usuario_nome: 'Eu', status: StatusUsuarioChamada.Entrou },
    ] })
    rota('POST', '/chamada/sair', { id: 1 })
    await call.tratarEventoChamada({ tipo: 55, chamada_id: 1, usuario_id: ANA })
    expect(pedidosDe('POST', '/chamada/sair')).toHaveLength(1)
    expect(call.estado).toBe('inativo')
  })

  test('conexão com um participante caindo é refeita', async () => {
    const call = await emChamada()
    const antiga = call.peers.get(ANA)!.rxPc as unknown as { mudarEstado: (e: string) => void }
    antiga.mudarEstado('failed')
    expect(call.peers.get(ANA)!.rxPc).toBeNull()
    relogio.avancar(2000)
    await aguardar(10)
    expect(call.peers.get(ANA)!.rxPc).not.toBeNull()
  })

  test('adicionar pessoa atualiza a chamada; quem já está nela sai da lista de contatos', async () => {
    const call = await emChamada()
    useChatStore().contatos = [{ id: ANA, nome: 'Ana' }, { id: CARLA, nome: 'Carla' }] as never
    expect(call.contatosNaoNaChamada.map((c: { id: number }) => c.id)).toEqual([CARLA])
    rota('PUT', '/chamada/usuario', { id: 1 })
    rota('GET', '/chamada/dados', chamadaApi(TipoChamada.Video, StatusUsuarioChamada.Entrou, [[CARLA, 'Carla', StatusUsuarioChamada.Pendente]]))
    await call.adicionarUsuario(CARLA)
    expect(pedidosDe('PUT', '/chamada/usuario')[0]!.corpo).toEqual({ chamada_id: 1, usuario_id: CARLA })
    expect(call.contatosNaoNaChamada).toEqual([])
    expect(call.participantesAtivos.map((u) => u.usuario_id)).toEqual([ANA, EU])
  })
})

describe('vídeo ligado no meio de uma chamada de áudio', () => {
  async function emChamadaDeAudio() {
    mediamtx([ANA], false)
    const call = await receber(TipoChamada.Audio)
    await atender(call)
    mediamtx()
    return call
  }

  test('pergunta "transmitir ou só assistir"; sem resposta em 15 s, só assiste em tela única', async () => {
    const call = await emChamadaDeAudio()
    await call.tratarEventoChamada({ tipo: 56, chamada_id: 1, usuario_id: ANA })
    expect(call.videoAtivadoPor).toEqual({ usuarioId: ANA, usuarioNome: 'Ana' })
    relogio.avancar(15_000)
    await relogio.rodar(Promise.resolve())
    for (let i = 0; i < 20 && call.telaUnicaSolicitada === null; i++) { await aguardar(); relogio.avancar(500) }
    expect(call.videoAtivadoPor).toBeNull()
    expect(call.tipoChamada).toBe(TipoChamada.Video)
    expect(call.cameraMutada).toBe(true)
    expect(call.telaUnicaSolicitada).toBe(ANA)
  })

  test('escolher transmitir liga a câmera, sem tela única', async () => {
    const call = await emChamadaDeAudio()
    await call.tratarEventoChamada({ tipo: 56, chamada_id: 1, usuario_id: ANA })
    await relogio.rodar(call.responderUpgradeVideo(true))
    expect(call.tipoChamada).toBe(TipoChamada.Video)
    expect(call.cameraMutada).toBe(false)
    expect(call.streamLocal!.getVideoTracks()).toHaveLength(1)
    expect(call.telaUnicaSolicitada).toBeNull()
  })

  test('eu ligo o vídeo: avisa os outros', async () => {
    const call = await emChamadaDeAudio()
    rota('POST', '/chamada/video', {})
    await relogio.rodar(call.upgradeParaVideo())
    expect(call.tipoChamada).toBe(TipoChamada.Video)
    expect(pedidosDe('POST', '/chamada/video')).toHaveLength(1)
  })

  test('eu ligo o vídeo sem cortar o áudio: o novo entra antes de o antigo fechar, mostrando a etapa', async () => {
    const call = await emChamadaDeAudio()
    rota('POST', '/chamada/video', {})
    const publicacaoAntiga = conexoes.find((c) => c.transceivers.some((t) => t.direction === 'sendrecv'))!
    const assinaturaAntiga = call.peers.get(ANA)!.rxPc as unknown as ConexaoFalsa
    const visto: Record<string, unknown> = {}
    rota('POST', `/webrtc/call-1-u-${EU}/whip`, () => {
      visto.whip = { etapa: call.etapaVideo, antigaFechada: publicacaoAntiga.fechada }
      return new Response('v=0\r\nm=audio\r\nm=video')
    })
    rota('POST', `/webrtc/call-1-u-${ANA}/whep`, () => {
      visto.whep = { etapa: call.etapaVideo, antigaFechada: assinaturaAntiga.fechada }
      return new Response('v=0\r\nm=audio\r\nm=video')
    })
    const ligando = call.upgradeParaVideo()
    expect(call.etapaVideo).toBe('camera')
    await relogio.rodar(ligando)
    expect(visto).toEqual({ whip: { etapa: 'enviando', antigaFechada: false }, whep: { etapa: 'recebendo', antigaFechada: false } })
    expect(publicacaoAntiga.fechada).toBe(true)
    expect(assinaturaAntiga.fechada).toBe(true)
    expect(call.peers.get(ANA)!.stream!.getVideoTracks()).toHaveLength(1)
    expect(call.etapaVideo).toBeNull()
  })

  test('aviso de vídeo numa chamada de áudio já assina de novo quem ligou, antes da resposta', async () => {
    const call = await emChamadaDeAudio()
    const antes = call.peers.get(ANA)!.rxPc
    await relogio.rodar(call.tratarEventoChamada({ tipo: 56, chamada_id: 1, usuario_id: ANA }))
    expect(call.videoAtivadoPor).toEqual({ usuarioId: ANA, usuarioNome: 'Ana' })
    expect(call.peers.get(ANA)!.rxPc).not.toBe(antes)
  })

  test('já em vídeo, o aviso só refaz a assinatura de quem republicou', async () => {
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    const antes = call.peers.get(ANA)!.rxPc
    await relogio.rodar(call.tratarEventoChamada({ tipo: 56, chamada_id: 1, usuario_id: ANA }))
    expect(call.videoAtivadoPor).toBeNull()
    expect(call.peers.get(ANA)!.rxPc).not.toBe(antes)
  })
})

describe('ligar', () => {
  test('vídeo: pega câmera e microfone, cria a chamada e já publica', async () => {
    mediamtx([])
    rota('PUT', '/chamada/iniciar', chamadaApi(TipoChamada.Video))
    const call = novaStore()
    await call.iniciarChamada(TipoChamada.Video, [{ id: EU }, { id: ANA }])
    expect(call.estado).toBe('chamando')
    expect(pedidosDe('POST', `/webrtc/call-1-u-${EU}/whip`)).toHaveLength(1)
  })

  test('sem câmera, liga só com áudio; sem microfone, não liga', async () => {
    aparelhos.camera = false
    mediamtx([])
    rota('PUT', '/chamada/iniciar', chamadaApi(TipoChamada.Video))
    const call = novaStore()
    await call.iniciarChamada(TipoChamada.Video, [{ id: ANA }])
    expect(call.streamLocal!.getVideoTracks()).toHaveLength(0)
    call.encerrarChamada()
    aparelhos.microfone = false
    await expect(call.iniciarChamada(TipoChamada.Audio, [{ id: ANA }])).rejects.toThrow('Nao foi possivel acessar o microfone')
    expect(call.estado).toBe('inativo')
  })

  test('não liga com outra chamada em andamento', async () => {
    mediamtx([])
    rota('PUT', '/chamada/iniciar', chamadaApi(TipoChamada.Audio))
    const call = novaStore()
    await call.iniciarChamada(TipoChamada.Audio, [{ id: ANA }])
    await expect(call.iniciarChamada(TipoChamada.Audio, [{ id: ANA }])).rejects.toThrow('Ja existe uma chamada em andamento')
  })

  test('quando atendem, a chamada fica ativa', async () => {
    mediamtx()
    rota('PUT', '/chamada/iniciar', chamadaApi(TipoChamada.Video))
    const call = novaStore()
    await call.iniciarChamada(TipoChamada.Video, [{ id: ANA }])
    rota('GET', '/chamada/dados', chamadaApi(TipoChamada.Video, StatusUsuarioChamada.Entrou))
    await relogio.rodar(call.tratarEventoChamada({ tipo: 54, chamada_id: 1, usuario_id: ANA }))
    expect(call.estado).toBe('ativa')
  })

  test('em conversa direta, a recusa do outro encerra', async () => {
    mediamtx([])
    rota('PUT', '/chamada/iniciar', chamadaApi(TipoChamada.Audio))
    const call = novaStore()
    await call.iniciarChamada(TipoChamada.Audio, [{ id: ANA }])
    rota('GET', '/chamada/dados', { ...chamadaApi(TipoChamada.Audio), usuarios: [
      { usuario_id: ANA, usuario_nome: 'Ana', status: StatusUsuarioChamada.Recusou },
      { usuario_id: EU, usuario_nome: 'Eu', status: StatusUsuarioChamada.Entrou },
    ] })
    await call.tratarEventoChamada({ tipo: 53, chamada_id: 1, usuario_id: ANA })
    expect(call.estado).toBe('inativo')
  })

  test('cancelar enquanto chama', async () => {
    mediamtx([])
    rota('PUT', '/chamada/iniciar', chamadaApi(TipoChamada.Audio))
    rota('POST', '/chamada/cancelar', { id: 1 })
    const call = novaStore()
    await call.iniciarChamada(TipoChamada.Audio, [{ id: ANA }])
    await call.cancelarChamada()
    expect(pedidosDe('POST', '/chamada/cancelar')).toHaveLength(1)
    expect(call.estado).toBe('inativo')
  })

  test('ligar compartilhando a tela: transmite a tela com o microfone', async () => {
    mediamtx([])
    rota('PUT', '/chamada/iniciar', chamadaApi(TipoChamada.Video))
    const call = novaStore()
    await call.iniciarChamada(TipoChamada.Video, [{ id: ANA }], true)
    expect(call.compartilhandoTela).toBe(true)
    expect(call.streamLocal!.getVideoTracks()[0]!.label).toBe('tela')
    expect(call.streamLocal!.getAudioTracks()[0]!.label).toBe('microfone')
  })
})

describe('compartilhar a tela', () => {
  test('troca a câmera pela tela na transmissão e volta ao parar', async () => {
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    const antes = call.streamLocal
    await call.compartilharTela()
    expect(call.compartilhandoTela).toBe(true)
    const publicacao = conexoes.find((c) => c.transceivers.some((t) => t.direction === 'sendrecv'))!
    const video = publicacao.transceivers.find((t) => t.receiver.track.kind === 'video')!
    expect((video.sender.track as TrilhaFalsa).label).toBe('tela')
    // O tile local vê a tela num stream novo (no mesmo, o <video> seguia na câmera)
    expect(call.streamLocal).not.toBe(antes)
    expect(call.streamLocal!.getTracks().map((t) => t.label)).toEqual(['microfone', 'tela'])
    const compartilhando = call.streamLocal
    await call.pararCompartilhamento()
    expect(call.compartilhandoTela).toBe(false)
    expect((video.sender.track as TrilhaFalsa).label).toBe('camera')
    expect(call.streamLocal).not.toBe(compartilhando)
    expect(call.streamLocal!.getTracks().map((t) => t.label)).toEqual(['microfone', 'camera'])
  })

  test('com o som do computador, mistura com o microfone numa trilha só', async () => {
    aparelhos.telaComAudio = true
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    await call.compartilharTela()
    const publicacao = conexoes.find((c) => c.transceivers.some((t) => t.direction === 'sendrecv'))!
    const audio = publicacao.transceivers.find((t) => t.receiver.track.kind === 'audio')!
    expect((audio.sender.track as TrilhaFalsa).label).toBe('mistura')
    await call.pararCompartilhamento()
    expect((audio.sender.track as TrilhaFalsa).label).toBe('microfone')
  })

  test('em chamada de áudio não compartilha', async () => {
    mediamtx([ANA], false)
    const call = await receber(TipoChamada.Audio)
    await atender(call)
    await call.compartilharTela()
    expect(call.compartilhandoTela).toBe(false)
  })
})

describe('ponteiro na tela compartilhada', () => {
  async function emChamada() {
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    const sinais: unknown[] = []
    useChatStore().enviarSinalChamada = (chamadaId, dados) => { sinais.push({ chamadaId, ...dados }) }
    return { call, sinais }
  }

  test('avisa os outros ao compartilhar e ao parar; repete para quem entra depois', async () => {
    const { call, sinais } = await emChamada()
    await call.compartilharTela()
    expect(sinais).toEqual([{ chamadaId: 1, acao: 'tela', ativa: true }])
    rota('POST', `/webrtc/call-1-u-${CARLA}/whep`, new Response('v=0\r\nm=audio\r\nm=video'))
    rota('GET', '/chamada/dados', chamadaApi(TipoChamada.Video, StatusUsuarioChamada.Entrou, [[CARLA, 'Carla', StatusUsuarioChamada.Entrou]]))
    await relogio.rodar(call.tratarEventoChamada({ tipo: 54, chamada_id: 1, usuario_id: CARLA }))
    expect(sinais).toHaveLength(2)
    expect(sinais[1]).toEqual({ chamadaId: 1, acao: 'tela', ativa: true })
    await call.pararCompartilhamento()
    expect(sinais.at(-1)).toEqual({ chamadaId: 1, acao: 'tela', ativa: false })
  })

  test('ponteiro de outro aparece com o nome, some quando sai e quando a tela para', async () => {
    const { call } = await emChamada()
    await call.tratarEventoChamada({ tipo: 57, chamada_id: 1, usuario_id: ANA, dados: { acao: 'tela', ativa: true } })
    expect(call.telasRemotas.has(ANA)).toBe(true)
    await call.tratarEventoChamada({ tipo: 57, chamada_id: 1, usuario_id: ANA, dados: { acao: 'ponteiro', alvo: EU, x: 0.5, y: 0.25 } })
    expect(call.ponteiros.get(ANA)).toEqual({ usuarioId: ANA, nome: 'Ana', alvo: EU, x: 0.5, y: 0.25 })
    await call.tratarEventoChamada({ tipo: 57, chamada_id: 1, usuario_id: ANA, dados: { acao: 'ponteiro', alvo: EU, x: null, y: null } })
    expect(call.ponteiros.size).toBe(0)

    await call.tratarEventoChamada({ tipo: 57, chamada_id: 1, usuario_id: ANA, dados: { acao: 'ponteiro', alvo: ANA, x: 0.1, y: 0.1 } })
    expect(call.ponteiros.size).toBe(1)
    await call.tratarEventoChamada({ tipo: 57, chamada_id: 1, usuario_id: ANA, dados: { acao: 'tela', ativa: false } })
    expect(call.telasRemotas.size).toBe(0)
    expect(call.ponteiros.size).toBe(0)
  })

  test('aviso de participantes recarrega a lista da chamada', async () => {
    const { call } = await emChamada()
    rota('GET', '/chamada/dados', chamadaApi(TipoChamada.Video, StatusUsuarioChamada.Entrou, [[CARLA, 'Carla', StatusUsuarioChamada.Pendente]]))
    await call.tratarEventoChamada({ tipo: 57, chamada_id: 1, usuario_id: ANA, dados: { acao: 'participantes' } })
    await aguardar(5)
    expect(call.participantesAguardando.map((u) => u.usuario_nome)).toEqual(['Carla'])
  })

  test('ponteiro parado some sozinho; sinal de outra chamada é ignorado', async () => {
    const { call } = await emChamada()
    await call.tratarEventoChamada({ tipo: 57, chamada_id: 1, usuario_id: ANA, dados: { acao: 'ponteiro', alvo: EU, x: 0.5, y: 0.5 } })
    relogio.avancar(5000)
    expect(call.ponteiros.size).toBe(0)
    await call.tratarEventoChamada({ tipo: 57, chamada_id: 99, usuario_id: ANA, dados: { acao: 'tela', ativa: true } })
    expect(call.telasRemotas.size).toBe(0)
  })

  test('o botão só liga com tela de outro, e desliga quando ela para; a posição vai no máximo a cada 40 ms', async () => {
    const { call, sinais } = await emChamada()
    call.alternarPonteiro()
    expect(call.ponteiroAtivo).toBe(false)
    await call.tratarEventoChamada({ tipo: 57, chamada_id: 1, usuario_id: ANA, dados: { acao: 'tela', ativa: true } })
    call.alternarPonteiro()
    expect(call.ponteiroAtivo).toBe(true)

    call.moverPonteiro(ANA, 0.1, 0.1)
    call.moverPonteiro(ANA, 0.2, 0.2)
    call.moverPonteiro(ANA, 0.3, 0.3)
    expect(sinais).toEqual([{ chamadaId: 1, acao: 'ponteiro', alvo: ANA, x: 0.1, y: 0.1 }])
    relogio.avancar(40)
    expect(sinais.at(-1)).toEqual({ chamadaId: 1, acao: 'ponteiro', alvo: ANA, x: 0.3, y: 0.3 })
    expect(sinais).toHaveLength(2)

    await call.tratarEventoChamada({ tipo: 57, chamada_id: 1, usuario_id: ANA, dados: { acao: 'tela', ativa: false } })
    await aguardar()
    expect(call.ponteiroAtivo).toBe(false)
  })
})

describe('chat da chamada', () => {
  test('não existe até ser pedido; pedir cria uma vez e guarda o grupo', async () => {
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    expect(call.conversaChatId).toBeNull()
    rota('PUT', '/chamada/chat', { conversa_id: 40 })
    expect(await call.garantirChatChamada()).toBe(40)
    expect(await call.garantirChatChamada()).toBe(40)
    expect(pedidosDe('PUT', '/chamada/chat')).toHaveLength(1)
    expect(pedidosDe('PUT', '/chamada/chat')[0]!.corpo).toEqual({ id: 1 })
  })

  test('criado por outro participante: o aviso do servidor traz o grupo', async () => {
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    await call.tratarEventoChamada({ tipo: 57, chamada_id: 1, usuario_id: ANA, dados: { acao: 'chat', conversa_id: 41 } })
    expect(call.conversaChatId).toBe(41)
  })
})

describe('qualidade da chamada', () => {
  test('a configuração vai para a câmera e o microfone pedidos', async () => {
    const { config } = useConfigChamada()
    config.value = { ...config.value, resolucao: '1080', fps: 30, reducaoRuido: false, qualidadeAudio: 'musica' }
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    expect(pedidosMidia[0]).toMatchObject({
      audio: { noiseSuppression: false, channelCount: 2 },
      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } },
    })
  })

  test('música pede estéreo no SDP e limita o envio', async () => {
    const { config } = useConfigChamada()
    config.value = { ...config.value, qualidadeAudio: 'musica', bandaVideo: 'economico' }
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    expect(pedidosDe('POST', `/webrtc/call-1-u-${EU}/whip`)[0]!.corpo).toContain('stereo=1')
    const publicacao = conexoes.find((c) => c.transceivers.some((t) => t.direction === 'sendrecv'))!
    expect(publicacao.localDescription!.sdp).toContain('stereo=1;sprop-stereo=1')
    const [audio, video] = publicacao.transceivers
    expect(audio!.parametros.encodings[0]!.maxBitrate).toBe(128_000)
    expect(video!.parametros.encodings[0]!.maxBitrate).toBe(500_000)
  })

  test('vídeo publicado em codec que o MediaMTX grava: H264, depois VP9 (VP8 por último)', async () => {
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    const publicacao = conexoes.find((c) => c.transceivers.some((t) => t.direction === 'sendrecv'))!
    const [audio, video] = publicacao.transceivers
    expect(video!.codecsPreferidos).toEqual(['video/H264', 'video/VP9', 'video/VP8', 'video/AV1'])
    // O áudio (Opus) já é gravável: fica como está
    expect(audio!.codecsPreferidos).toBeNull()
  })

  test('mudar a qualidade durante a chamada reabre o microfone na transmissão', async () => {
    mediamtx()
    const call = await receber(TipoChamada.Video)
    await atender(call)
    const antigo = call.streamLocal!.getAudioTracks()[0] as unknown as TrilhaFalsa
    const { config } = useConfigChamada()
    config.value = { ...config.value, reducaoRuido: false }
    await aguardar(10)
    expect(antigo.readyState).toBe('ended')
    expect(call.streamLocal!.getAudioTracks()[0]).not.toBe(antigo)
  })
})
