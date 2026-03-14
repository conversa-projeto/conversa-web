import { TipoConversa } from '../types/api'
import type { Conversa, Usuario } from '../types/api'

export type UsuarioPopup = Pick<Usuario, 'id' | 'nome' | 'login' | 'email' | 'telefone' | 'avatar_url'>

export function criarUsuarioPopup(usuario: Partial<UsuarioPopup> & { id: number; nome: string }): UsuarioPopup {
  return {
    id: usuario.id,
    nome: usuario.nome,
    login: usuario.login || '',
    email: usuario.email || '',
    telefone: usuario.telefone || '',
    avatar_url: usuario.avatar_url || ''
  }
}

export function resolverUsuarioDaConversa(conversa: Conversa, contatos: Usuario[]): UsuarioPopup | null {
  if (conversa.tipo !== TipoConversa.Direta) return null

  const contato = contatos.find((item) => item.id === conversa.destinatario_id)
  if (contato) {
    return criarUsuarioPopup({
      ...contato,
      avatar_url: contato.avatar_url || conversa.avatar_url || ''
    })
  }

  const nome = conversa.descricao || conversa.nome || `Conversa #${conversa.id}`
  return criarUsuarioPopup({
    id: conversa.destinatario_id || conversa.id,
    nome,
    avatar_url: conversa.avatar_url || ''
  })
}
