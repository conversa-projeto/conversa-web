import type { Page } from '@playwright/test'
import { abrirConversa, esperarMidiaChegando, expect, test } from './apoio'
import { lerContas } from './contas'

const contas = lerContas()

// No computador, a chamada de vídeo abre numa aba própria; o app fica com a
// barra do topo. A conexão (e o que se mede dela) continua na aba do app.
async function abaDaChamada(app: Page, acao: () => Promise<void>) {
  const [aba] = await Promise.all([app.context().waitForEvent('page'), acao()])
  await expect(aba.getByTitle('Sair da chamada')).toBeVisible()
  return aba
}

test('ligação de vídeo: liga, atende, áudio e vídeo dos dois lados, tela compartilhada, chat e desliga', async ({ abrirComo }) => {
  const ana = await abrirComo(contas.ana)
  const bruno = await abrirComo(contas.bruno)

  const abaAna = await test.step('Ana liga para Bruno; a chamada abre numa aba própria', async () => {
    await abrirConversa(ana, contas.bruno.nome)
    const aba = await abaDaChamada(ana, () => ana.getByTitle('Chamada de video').click())
    await expect(aba.getByText('Chamando...').first()).toBeVisible()
    // O app fica com a barra do topo, que traz a aba de volta
    await expect(ana.getByTitle('Sair da chamada')).toHaveCount(1)
    return aba
  })

  const abaBruno = await test.step('Bruno vê a chamada chegando e atende', async () => {
    const aba = await abaDaChamada(bruno, () => bruno.getByTitle('Atender', { exact: true }).click())
    await expect(abaAna.getByText('Em chamada').first()).toBeVisible()
    await expect(aba.getByText('Em chamada').first()).toBeVisible()
    return aba
  })

  await test.step('cada um recebe o áudio e o vídeo do outro', async () => {
    await esperarMidiaChegando(bruno, 'audio')
    await esperarMidiaChegando(bruno, 'video')
    await esperarMidiaChegando(ana, 'audio')
    await esperarMidiaChegando(ana, 'video')
    // O vídeo do outro aparece tocando na aba da chamada
    await expect.poll(() => abaBruno.evaluate(() =>
      [...document.querySelectorAll('video')].some((v) => v.readyState >= 2 && v.videoWidth > 0 && !v.paused)
    )).toBe(true)
  })

  await test.step('Ana compartilha a tela e Bruno passa a vê-la', async () => {
    await abaAna.getByTitle('Compartilhar tela').click()
    // Quem assiste uma tela compartilhada ganha o botão do ponteiro
    await expect(abaBruno.getByTitle('Apontar na tela compartilhada')).toBeVisible()
    await esperarMidiaChegando(bruno, 'video')
    await esperarMidiaChegando(bruno, 'audio')
  })

  const texto = `Mensagem do teste ${Date.now()}`
  await test.step('Ana escreve no chat da chamada e Bruno recebe', async () => {
    await abaAna.getByTitle('Chat da chamada').click()
    const campo = abaAna.getByPlaceholder('Mensagem')
    await campo.fill(texto)
    await campo.press('Enter')
    await abaBruno.getByTitle('Chat da chamada').click()
    await expect(abaBruno.getByText(texto)).toBeVisible()
  })

  await test.step('fechar a aba não desliga: a barra do app reabre a chamada', async () => {
    await abaBruno.close()
    await expect(bruno.getByText('Em chamada').first()).toBeVisible()
    await esperarMidiaChegando(bruno, 'audio')
  })

  await test.step('Ana desliga; a chamada acaba para os dois, a aba fecha e a ligação fica na conversa', async () => {
    await abaAna.getByTitle('Sair da chamada').click()
    await expect.poll(() => abaAna.isClosed()).toBe(true)
    await expect(bruno.getByText('Em chamada')).toHaveCount(0)
    await expect(ana.getByText('Em chamada')).toHaveCount(0)
    // A conversa direta já tem os dois: o chat da chamada é ela mesma
    await abrirConversa(bruno, contas.ana.nome)
    await expect(bruno.locator('[id^="msg-"]', { hasText: texto })).toBeVisible()
    await expect(bruno.getByText('Chamada de video').last()).toBeVisible()
  })
})

test('no celular, a chamada fica dentro do app, sem compartilhar tela; voltar ao chat deixa a barra no topo', async ({ abrirComo }) => {
  const ana = await abrirComo(contas.ana)
  const bruno = await abrirComo(contas.bruno, { celular: true })

  await abrirConversa(ana, contas.bruno.nome)
  const abaAna = await abaDaChamada(ana, () => ana.getByTitle('Chamada de video').click())

  await test.step('Bruno atende no celular: dentro do app, sem aba nova', async () => {
    const abasAntes = bruno.context().pages().length
    await bruno.getByTitle('Atender', { exact: true }).click()
    await expect(bruno.getByTitle('Sair da chamada').first()).toBeVisible()
    expect(bruno.context().pages()).toHaveLength(abasAntes)
    await expect(bruno.getByTitle('Compartilhar tela')).toHaveCount(0)
    await esperarMidiaChegando(bruno, 'video')
  })

  await test.step('voltar ao chat: a chamada vira a barra do topo e o app continua usável', async () => {
    await bruno.getByTitle('Voltar ao chat').click()
    await expect(bruno.getByRole('button', { name: 'Abrir chamada' })).toBeVisible()
    await expect(bruno.getByPlaceholder('Pesquisar...').first()).toBeVisible()
    await esperarMidiaChegando(bruno, 'audio')
    await bruno.getByRole('button', { name: 'Abrir chamada' }).click()
    await expect(bruno.getByTitle('Voltar ao chat')).toBeVisible()
  })

  await abaAna.getByTitle('Sair da chamada').click()
  await expect(bruno.getByTitle('Voltar ao chat')).toHaveCount(0)
})
