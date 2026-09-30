import { beforeEach, describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import IncomingCallModal from '@/components/IncomingCallModal.vue'
import { useCallStore } from '@/stores/call'
import { TipoChamada } from '@/types/api'

function chamadaRecebida(tipo: TipoChamada) {
  const call = useCallStore()
  call.estado = 'recebendo'
  call.tipoChamada = tipo
  call.chamada = {
    id: 1, tipo, status: 1, iniciada: null, finalizada: null, criado_em: new Date(), criado_por: 2,
    usuarios: [{ usuario_id: 2, usuario_nome: 'Ana', status: 3 }],
  } as never
  return mount(IncomingCallModal)
}

describe('IncomingCallModal', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('mostra quem liga e o tipo', () => {
    const tela = chamadaRecebida(TipoChamada.Video)
    expect(tela.text()).toContain('Ana está ligando')
    expect(tela.text()).toContain('Vídeo + Áudio')
  })

  test('chamada de vídeo oferece atender só assistindo', async () => {
    const tela = chamadaRecebida(TipoChamada.Video)
    const botao = tela.findAll('button').find((b) => b.text().includes('Atender só assistindo'))
    expect(botao).toBeDefined()
    await botao!.trigger('click')
    expect(tela.emitted('accept')).toEqual([[true]])
  })

  test('chamada de áudio não oferece só assistir', () => {
    const tela = chamadaRecebida(TipoChamada.Audio)
    expect(tela.text()).toContain('Somente Áudio')
    expect(tela.text()).not.toContain('Atender só assistindo')
  })

  test('atender e recusar', async () => {
    const tela = chamadaRecebida(TipoChamada.Audio)
    await tela.find('button[title="Atender"]').trigger('click')
    await tela.find('button[title="Recusar"]').trigger('click')
    expect(tela.emitted('accept')).toEqual([[]])
    expect(tela.emitted('reject')).toHaveLength(1)
  })

  test('sem chamada recebida não aparece', () => {
    expect(mount(IncomingCallModal).html()).not.toContain('Chamada recebida')
  })
})
