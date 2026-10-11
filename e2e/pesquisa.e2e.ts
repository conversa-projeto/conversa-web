import { abrirConversa, expect, test } from './apoio'
import { lerContas } from './contas'

const contas = lerContas()

test('pesquisa na conversa: resultado com quem, quando e o termo destacado; clicar leva à mensagem', async ({ abrirComo }, testInfo) => {
  const ana = await abrirComo(contas.ana)
  await abrirConversa(ana, contas.bruno.nome)

  const palavra = `abacaxi${Date.now() % 100000}`
  const campo = ana.getByRole('textbox', { name: 'Mensagem' })
  await campo.click()
  await campo.pressSequentially(`Comprei um ${palavra} para a reunião de amanhã`)
  await campo.press('Enter')
  await expect(ana.locator('[id^="msg-"]', { hasText: palavra })).toBeVisible()

  const busca = ana.getByPlaceholder('Pesquisar...').last()
  await busca.fill(palavra)
  await busca.press('Enter')

  const painel = ana.locator('[data-resultados-busca]')
  await expect(painel).toContainText(`1 resultado para “${palavra}”`)
  await expect(painel.locator('mark')).toHaveText(palavra)
  await expect(painel).toContainText('Você')

  for (const tema of ['claro', 'escuro'] as const) {
    await ana.evaluate((escuro) => document.documentElement.classList.toggle('dark', escuro), tema === 'escuro')
    await ana.screenshot({ path: testInfo.outputPath(`pesquisa-${tema}.png`), clip: { x: 0, y: 0, width: 1100, height: 300 } })
  }

  // A mensagem encontrada ganha uma faixa da largura da lista, que some aos poucos
  const mensagem = ana.locator('[id^="msg-"]', { hasText: palavra })
  for (const tema of ['claro', 'escuro'] as const) {
    await ana.evaluate((escuro) => document.documentElement.classList.toggle('dark', escuro), tema === 'escuro')
    await busca.press('Enter')
    await painel.getByRole('button').first().click()
    await expect(mensagem).toBeInViewport()
    await expect(mensagem).toHaveClass(/bg-surface-800\/15/)
    await ana.screenshot({ path: testInfo.outputPath(`destaque-${tema}.png`) })
    await expect(mensagem).not.toHaveClass(/bg-surface-800\/15/, { timeout: 5000 })
  }
})
