import { abrirConversa, expect, test } from './apoio'
import { lerContas } from './contas'

const contas = lerContas()

test('figurinhas Noto: o pacote aparece com o crédito, anima e chega a quem recebe', async ({ abrirComo }, testInfo) => {
  const ana = await abrirComo(contas.ana)
  const bruno = await abrirComo(contas.bruno)
  await abrirConversa(ana, contas.bruno.nome)
  await abrirConversa(bruno, contas.ana.nome)

  await ana.getByTitle('Emoji', { exact: true }).click()
  await ana.getByRole('button', { name: 'Figurinhas' }).click()
  const credito = ana.getByRole('link', { name: 'Animated Noto Emoji © Google, CC BY 4.0' })
  await credito.scrollIntoViewIfNeeded()
  await expect(credito).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/')

  // A animação é desenhada (SVG do lottie com conteúdo)
  const festa = ana.locator('button[title="Festejando"]')
  await festa.scrollIntoViewIfNeeded()
  await expect.poll(() => festa.locator('svg path').count()).toBeGreaterThan(5)
  await ana.screenshot({ path: testInfo.outputPath('figurinhas.png') })

  await festa.click()
  // Com o campo vazio, a figurinha vai na hora e chega ao Bruno animada
  await expect.poll(async () => {
    const ultima = bruno.locator('[id^="msg-"]').last()
    return ultima.locator('svg path').count()
  }, { timeout: 20_000 }).toBeGreaterThan(5)
  await bruno.screenshot({ path: testInfo.outputPath('recebida.png') })
})
