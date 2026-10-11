import { abrirConversa, expect, test } from './apoio'
import { lerContas } from './contas'

const contas = lerContas()

test('seletor de emojis: todas as categorias, pesquisa sem acento e só o que o navegador desenha', async ({ abrirComo }, testInfo) => {
  const ana = await abrirComo(contas.ana)
  await abrirConversa(ana, contas.bruno.nome)
  await ana.getByTitle('Emoji', { exact: true }).click()

  const seletor = ana.locator('input[aria-label="Pesquisar emoji"]').locator('xpath=ancestor::div[contains(@class,"w-[320px]")]')
  await expect(seletor.getByRole('button', { name: 'Símbolos' })).toBeVisible()
  await expect(seletor.getByRole('button', { name: 'Bandeiras' })).toHaveCount(0)
  for (const nome of ['Carinhas e emoções', 'Pessoas e corpo', 'Animais e natureza', 'Comida e bebida', 'Objetos']) {
    await expect(seletor.getByRole('button', { name: nome })).toBeVisible()
  }
  const quantos = await seletor.locator('[data-categoria] button').count()
  testInfo.annotations.push({ type: 'emojis à mostra', description: String(quantos) })
  expect(quantos).toBeGreaterThan(1300)
  await ana.screenshot({ path: testInfo.outputPath('seletor.png') })

  // Ir para uma categoria marca o ícone dela
  await seletor.getByRole('button', { name: 'Comida e bebida' }).click()
  await expect(seletor.getByRole('button', { name: 'Comida e bebida' })).toHaveClass(/bg-primary-100/)

  const campo = seletor.getByLabel('Pesquisar emoji')
  await campo.fill('coracao')
  await expect(seletor.locator('button[title="Coração vermelho"]')).toBeVisible()
  await ana.screenshot({ path: testInfo.outputPath('pesquisa.png') })

  // Escolher põe no campo e vira o primeiro dos recentes
  await seletor.locator('button[title="Coração vermelho"]').click()
  await expect(ana.getByRole('textbox', { name: 'Mensagem' })).toContainText('❤️')
  const recentes = JSON.parse(await ana.evaluate(() => localStorage.getItem('conversa.emojisRecentes') ?? '[]')) as string[]
  expect(recentes[0]).toBe('❤️')
})
