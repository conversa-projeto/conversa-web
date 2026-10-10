import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'

// Contas de teste no banco de desenvolvimento. As senhas são geradas na
// primeira vez e ficam em e2e/.contas.json (fora do Git).

export interface Conta {
  nome: string
  login: string
  senha: string
}

export interface Contas {
  ana: Conta
  bruno: Conta
}

const ARQUIVO = fileURLToPath(new URL('./.contas.json', import.meta.url))

export function lerContas(): Contas {
  if (existsSync(ARQUIVO)) {
    return JSON.parse(readFileSync(ARQUIVO, 'utf8')) as Contas
  }
  const senha = () => randomBytes(12).toString('base64url')
  const contas: Contas = {
    ana: { nome: 'Teste Ana E2E', login: 'e2e_ana', senha: senha() },
    bruno: { nome: 'Teste Bruno E2E', login: 'e2e_bruno', senha: senha() },
  }
  writeFileSync(ARQUIVO, JSON.stringify(contas, null, 2))
  return contas
}
