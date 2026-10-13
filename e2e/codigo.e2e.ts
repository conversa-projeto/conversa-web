import { abrirConversa, expect, test } from './apoio'
import { lerContas } from './contas'

const contas = lerContas()

test('código pelo "+": inserir no campo com prévia, editar na janela e enviar junto do texto', async ({ abrirComo }, testInfo) => {
  const ana = await abrirComo(contas.ana)
  await abrirConversa(ana, contas.bruno.nome)

  const marca = Date.now() % 100000
  const campo = ana.getByRole('textbox', { name: 'Mensagem' })
  await campo.click()
  await campo.pressSequentially(`Olha a consulta ${marca}:`)

  const janela = ana.locator('.cm-editor')
  await test.step('"+" > Código, escreve e insere na mensagem', async () => {
    await ana.getByTitle('Anexar').click()
    await ana.getByRole('button', { name: 'Código', exact: true }).click()
    await ana.locator('select').last().selectOption('sql')
    await janela.click()
    await ana.keyboard.type(`select *\nfrom clientes\nwhere id = ${marca}\norder by nome\nlimit 10`)
    await ana.getByRole('button', { name: 'Inserir na mensagem' }).click()
    await expect(janela).toHaveCount(0)
  })

  const peca = ana.locator('[data-codigo]')
  await test.step('no campo, a prévia com editar e remover', async () => {
    await expect(peca).toContainText('sql · 5 linhas')
    await expect(peca.locator('pre')).toContainText('from clientes')
    await expect(peca.locator('pre')).not.toContainText('limit 10')
    await ana.screenshot({ path: testInfo.outputPath('codigo-no-campo.png') })
  })

  await test.step('editar abre a janela com o código; salvar troca o bloco', async () => {
    await peca.getByTitle('Editar código').click()
    const edicao = ana.locator('div.fixed', { has: ana.getByRole('heading', { name: 'Editar código' }) })
    await expect(edicao).toBeVisible()
    await expect(edicao.getByRole('button', { name: 'Enviar', exact: true })).toHaveCount(0)
    await janela.click()
    await ana.keyboard.press('Control+End')
    await ana.keyboard.type(' offset 5')
    await ana.getByRole('button', { name: 'Salvar' }).click()
    await expect(peca.locator('pre')).toContainText('select *')
  })

  await test.step('Enter envia o texto e o código, na ordem', async () => {
    await campo.press('Enter')
    const enviada = ana.locator('[id^="msg-"]', { hasText: `Olha a consulta ${marca}` }).last()
    await expect(enviada).toBeVisible()
    await expect(enviada).toContainText('limit 10 offset 5')
    await expect(peca).toHaveCount(0)
  })
})
