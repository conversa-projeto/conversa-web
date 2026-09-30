import { describe, expect, test } from 'bun:test'
import { dividirMencoes, extrairMencoesCruas, textoParaEnvio } from '@/utils/mencoesTexto'
import { substituirAtalhoAntesDoCursor, substituirAtalhoNoFim } from '@/utils/emojiAtalhos'
import { emojiNome } from '@/utils/emojiNomes'
import { criarUsuarioPopup, resolverUsuarioDaConversa } from '@/utils/userProfile'
import { TipoConversa, type Conversa, type Usuario } from '@/types/api'

describe('menções no campo de texto', () => {
  const ana = { nome: 'Ana', id: 2 }
  const anaPaula = { nome: 'Ana Paula', id: 3 }

  test('marca o nome inteiro, preferindo o mais longo', () => {
    expect(dividirMencoes('oi @Ana Paula e @Ana!', [ana, anaPaula])).toEqual([
      { texto: 'oi ' },
      { texto: '@Ana Paula', mencao: anaPaula },
      { texto: ' e ' },
      { texto: '@Ana', mencao: ana },
      { texto: '!' },
    ])
  })

  test('"@Ana" não marca o começo de "@Anabela"', () => {
    expect(dividirMencoes('@Anabela', [ana])).toEqual([{ texto: '@Anabela' }])
  })

  test('no envio, volta ao formato @[Nome](id)', () => {
    expect(textoParaEnvio('oi @Ana', [ana])).toBe('oi @[Ana](2)')
    expect(textoParaEnvio('sem menção', [])).toBe('sem menção')
  })

  test('texto colado com o formato cru mostra @Nome e devolve as menções', () => {
    expect(extrairMencoesCruas('fala @[Ana](2) e @[Bruno](5)')).toEqual({
      texto: 'fala @Ana e @Bruno',
      mencoes: [{ nome: 'Ana', id: 2 }, { nome: 'Bruno', id: 5 }],
    })
  })
})

describe('atalhos de emoji', () => {
  test('troca o atalho logo antes do espaço e ajusta o cursor', () => {
    expect(substituirAtalhoAntesDoCursor('oi :) ', 6)).toEqual({ texto: 'oi 🙂 ', cursor: 6 })
    expect(substituirAtalhoAntesDoCursor(':D\nlinha', 3)).toEqual({ texto: '😃\nlinha', cursor: 3 })
  })

  test('o atalho mais longo vence (:-) e não :-)', () => {
    expect(substituirAtalhoAntesDoCursor(':-) ', 4)!.texto).toBe('🙂 ')
  })

  test('não troca dentro de palavra, URL ou código', () => {
    expect(substituirAtalhoAntesDoCursor('http:/ ', 7)).toBeNull()
    expect(substituirAtalhoAntesDoCursor('`:) ', 4)).toBeNull()
    expect(substituirAtalhoAntesDoCursor('```\n:) ', 7)).toBeNull()
    expect(substituirAtalhoAntesDoCursor('sem atalho ', 11)).toBeNull()
  })

  test('no envio, troca o atalho que ficou no fim', () => {
    expect(substituirAtalhoNoFim('valeu <3')).toBe('valeu ❤️')
    expect(substituirAtalhoNoFim('\\o/')).toBe('🙌')
    expect(substituirAtalhoNoFim('código `x :)')).toBe('código `x :)')
    expect(substituirAtalhoNoFim('nada aqui')).toBe('nada aqui')
  })
})

describe('nomes de emoji', () => {
  test('nome em português, ou o próprio emoji', () => {
    expect(emojiNome('👍')).toBe('Joinha')
    expect(emojiNome('🦜')).toBe('🦜')
  })
})

describe('perfil de quem está na conversa', () => {
  const conversa = (extras: Partial<Conversa>): Conversa => ({ id: 10, descricao: 'Bruno', tipo: TipoConversa.Direta, inserida: new Date(), ...extras })
  const contatos = [{ id: 5, nome: 'Bruno', login: 'bruno', email: 'b@t', telefone: null, avatar_url: null }] as Usuario[]

  test('preenche os campos que faltam com vazio', () => {
    expect(criarUsuarioPopup({ id: 1, nome: 'Ana' })).toEqual({ id: 1, nome: 'Ana', login: '', email: '', telefone: '', avatar_url: '' })
  })

  test('conversa direta: usa o contato, com o avatar da conversa se ele não tiver', () => {
    expect(resolverUsuarioDaConversa(conversa({ destinatario_id: 5, avatar_url: 'av' }), contatos)).toMatchObject({ id: 5, login: 'bruno', avatar_url: 'av' })
  })

  test('conversa direta sem o contato na lista: monta pelo que a conversa tem', () => {
    expect(resolverUsuarioDaConversa(conversa({ destinatario_id: 9, descricao: null, nome: 'Carla' }), contatos)).toMatchObject({ id: 9, nome: 'Carla' })
    expect(resolverUsuarioDaConversa(conversa({ destinatario_id: null, descricao: null }), [])).toMatchObject({ id: 10, nome: 'Conversa #10' })
  })

  test('grupo não tem perfil', () => {
    expect(resolverUsuarioDaConversa(conversa({ tipo: TipoConversa.Grupo }), contatos)).toBeNull()
  })
})
