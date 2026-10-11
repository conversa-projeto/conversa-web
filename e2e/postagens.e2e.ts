import { abrirConversa, expect, test } from './apoio'
import { GRUPO_E2E, lerContas } from './contas'

const contas = lerContas()

test('postagem no grupo: criar com título, responder embaixo dela e as respostas fora do fluxo', async ({ abrirComo }, testInfo) => {
  const ana = await abrirComo(contas.ana)
  const bruno = await abrirComo(contas.bruno)
  await abrirConversa(ana, GRUPO_E2E)
  await abrirConversa(bruno, GRUPO_E2E)

  const marca = Date.now() % 100000
  const titulo = `Aviso ${marca}`
  await test.step('Ana cria a postagem pelo "+", com título', async () => {
    await ana.getByTitle('Anexar').click()
    await ana.getByRole('button', { name: 'Postagem' }).click()
    await ana.getByLabel('Título da postagem').fill(titulo)
    const campo = ana.getByRole('textbox', { name: 'Mensagem' })
    await campo.click()
    await campo.pressSequentially('Reunião amanhã às 9h na sala 2')
    await campo.press('Enter')
    await expect(ana.locator('[data-postagem]', { hasText: titulo })).toBeVisible()
  })

  const postagemBruno = bruno.locator('[data-postagem]', { hasText: titulo })
  const resposta = `Estarei lá ${marca}`
  await test.step('Bruno vê a postagem e responde nela', async () => {
    await expect(postagemBruno).toBeVisible()
    await postagemBruno.getByLabel('Responder à postagem').fill(resposta)
    await postagemBruno.getByLabel('Responder à postagem').press('Enter')
    await expect(postagemBruno.locator('[data-resposta]', { hasText: resposta })).toBeVisible()
  })

  await test.step('Ana vê a resposta embaixo da postagem, e não no fluxo da conversa', async () => {
    const postagemAna = ana.locator('[data-postagem]', { hasText: titulo })
    await expect(postagemAna.locator('[data-resposta]', { hasText: resposta })).toBeVisible()
    await expect(postagemAna).toContainText('1 resposta')
    // Fora da postagem, nenhuma bolha com a resposta
    await expect(ana.locator('[id^="msg-"]:not(:has([data-postagem]))', { hasText: resposta })).toHaveCount(0)
    await postagemAna.scrollIntoViewIfNeeded()
    await ana.screenshot({ path: testInfo.outputPath('postagem.png') })
  })
})
