import { expect, test } from './apoio'
import { lerContas } from './contas'

const contas = lerContas()

// Só a janela: escolhe e cancela, sem criar grupos no banco de desenvolvimento
test('criar grupo: escolher imagem ou emoji, com a prévia na janela', async ({ abrirComo }, testInfo) => {
  const ana = await abrirComo(contas.ana)
  await ana.getByTitle('Novo grupo').click()
  const janela = ana.locator('[data-avatar-novo-grupo]').locator('xpath=ancestor::div[contains(@class,"max-w-md")]')
  const avatar = janela.locator('[data-avatar-novo-grupo] span.h-14')
  await janela.getByPlaceholder('Ex: Projeto Alpha').fill('Festa')
  await expect(avatar).toHaveText('F')

  await test.step('emoji pelo seletor', async () => {
    await janela.getByRole('button', { name: 'Emoji', exact: true }).click()
    await janela.getByLabel('Pesquisar emoji').fill('balao')
    await janela.getByRole('button', { name: '🎈' }).first().click()
    await expect(avatar).toHaveText('🎈')
    await ana.screenshot({ path: testInfo.outputPath('grupo-emoji.png') })
  })

  await test.step('imagem escolhida troca o emoji; Remover volta para a letra', async () => {
    // PNG de 1x1 vermelho
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64')
    await janela.locator('input[type="file"]').setInputFiles({ name: 'grupo.png', mimeType: 'image/png', buffer: png })
    await expect(janela.locator('[data-avatar-novo-grupo] img[alt="Imagem do grupo"]')).toBeVisible()
    await janela.getByRole('button', { name: 'Remover' }).click()
    await expect(avatar).toHaveText('F')
  })

  await janela.getByRole('button', { name: 'Cancelar' }).click()
  await expect(janela).toHaveCount(0)
})
