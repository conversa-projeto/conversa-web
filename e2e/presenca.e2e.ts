import { abrirConversa, expect, test } from './apoio'
import { lerContas } from './contas'

const contas = lerContas()

test('presença: o próprio avatar mostra ativo; o outro aparece ativo e "nesta conversa"', async ({ abrirComo }) => {
  const ana = await abrirComo(contas.ana)
  await expect(ana.getByTitle('Para os outros você aparece ativo').first()).toBeVisible()
  const bruno = await abrirComo(contas.bruno)
  await expect(bruno.getByTitle('Para os outros você aparece ativo').first()).toBeVisible()

  await abrirConversa(ana, contas.bruno.nome)
  await expect(ana.locator('header p, p').filter({ hasText: /^ativo agora$/ }).first()).toBeVisible()
  await abrirConversa(bruno, contas.ana.nome)
  await expect(ana.getByText('nesta conversa', { exact: true })).toBeVisible()
})
