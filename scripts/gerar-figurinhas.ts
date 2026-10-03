// Gera as figurinhas animadas (Lottie) em public/figurinhas/<pacote>.
// Rode com: bun scripts/gerar-figurinhas.ts
//
// Cada figurinha é desenhada aqui com formas simples (círculos, estrelas e
// caminhos) e animada por quadros-chave. O catálogo exibido no seletor fica em
// src/utils/figurinhas.ts: figurinha nova precisa entrar nos dois.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const TAMANHO = 512
const QUADROS_POR_SEGUNDO = 30
const DURACAO = 60
const CENTRO = TAMANHO / 2

type Cor = [number, number, number]
type Ponto = [number, number]
interface Quadro { t: number; s: number[] }

const hex = (cor: string): Cor => [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16) / 255) as Cor

const fixo = (k: unknown) => ({ a: 0, k })

// Quadros-chave com aceleração suave na entrada e na saída
function animado(quadros: Quadro[]) {
  return {
    a: 1,
    k: quadros.map((quadro, i) => i === quadros.length - 1
      ? { t: quadro.t, s: quadro.s }
      : {
          t: quadro.t,
          s: quadro.s,
          o: { x: quadro.s.map(() => 0.42), y: quadro.s.map(() => 0) },
          i: { x: quadro.s.map(() => 0.58), y: quadro.s.map(() => 1) },
        }),
  }
}

// --- Formas ---

const elipse = (largura: number, altura = largura, centro: Ponto = [0, 0]) => ({ ty: 'el', d: 1, p: fixo(centro), s: fixo([largura, altura]) })

const retangulo = (largura: number, altura: number, raio = 0) => ({ ty: 'rc', d: 1, p: fixo([0, 0]), s: fixo([largura, altura]), r: fixo(raio) })

const estrela = (raioExterno: number, raioInterno: number, pontas = 5) => ({
  ty: 'sr', sy: 1, d: 1, pt: fixo(pontas), p: fixo([0, 0]), r: fixo(0),
  or: fixo(raioExterno), os: fixo(0), ir: fixo(raioInterno), is: fixo(0),
})

// Caminho: vértices e, para cada um, as tangentes de entrada e de saída
function caminho(vertices: Ponto[], entrada: Ponto[] = [], saida: Ponto[] = [], fechado = false) {
  const zero = vertices.map((): Ponto => [0, 0])
  return { ty: 'sh', ks: fixo({ v: vertices, i: entrada.length ? entrada : zero, o: saida.length ? saida : zero, c: fechado }) }
}

const preenchimento = (cor: string) => ({ ty: 'fl', c: fixo([...hex(cor), 1]), o: fixo(100), r: 1 })

const contorno = (cor: string, largura: number) => ({ ty: 'st', c: fixo([...hex(cor), 1]), o: fixo(100), w: fixo(largura), lc: 2, lj: 2 })

// Desenha o contorno aos poucos, de 0 a 100% entre os quadros dados
const desenhar = (inicio: number, fim: number) => ({ ty: 'tm', m: 1, s: fixo(0), o: fixo(0), e: animado([{ t: inicio, s: [0] }, { t: fim, s: [100] }]) })

interface Transformacao {
  posicao?: Ponto | ReturnType<typeof animado>
  escala?: Ponto | ReturnType<typeof animado>
  rotacao?: number | ReturnType<typeof animado>
  opacidade?: number | ReturnType<typeof animado>
}

const valor = <T>(v: T | ReturnType<typeof animado>) => (typeof v === 'object' && v !== null && 'a' in v ? v : fixo(v))

function grupo(itens: object[], transformacao: Transformacao = {}) {
  return {
    ty: 'gr',
    it: [
      ...itens,
      {
        ty: 'tr',
        p: valor(transformacao.posicao ?? [0, 0]),
        a: fixo([0, 0]),
        s: valor(transformacao.escala ?? [100, 100]),
        r: valor(transformacao.rotacao ?? 0),
        o: valor(transformacao.opacidade ?? 100),
        sk: fixo(0),
        sa: fixo(0),
      },
    ],
  }
}

// Camada de formas, com a origem no centro da figurinha
function camada(nome: string, formas: object[], transformacao: Transformacao = {}) {
  const pos = transformacao.posicao ?? [0, 0]
  const posicao = Array.isArray(pos)
    ? fixo([CENTRO + pos[0], CENTRO + pos[1], 0])
    : { a: 1, k: pos.k.map((q) => ({ ...q, s: [CENTRO + q.s[0]!, CENTRO + q.s[1]!, 0] })) }
  const escala = transformacao.escala ?? [100, 100]
  return {
    ddd: 0, ty: 4, sr: 1, ao: 0, bm: 0, ip: 0, op: DURACAO, st: 0, nm: nome,
    ks: {
      o: valor(transformacao.opacidade ?? 100),
      r: valor(transformacao.rotacao ?? 0),
      p: posicao,
      a: fixo([0, 0, 0]),
      s: Array.isArray(escala) ? fixo([...escala, 100]) : { a: 1, k: escala.k.map((q) => ({ ...q, s: [...q.s, 100] })) },
    },
    shapes: formas,
  }
}

function figurinha(nome: string, camadas: object[]) {
  return {
    v: '5.7.4', fr: QUADROS_POR_SEGUNDO, ip: 0, op: DURACAO, w: TAMANHO, h: TAMANHO, nm: nome, ddd: 0, assets: [],
    // A primeira camada fica por cima
    layers: camadas.map((c, i) => ({ ...c, ind: i + 1 })),
  }
}

const AMARELO = '#FFC83D'
const AMARELO_ESCURO = '#E59E0B'
const MARROM = '#5B3A1A'

// Rosto redondo, base das figurinhas de rosto
const rosto = (cor = AMARELO, borda = AMARELO_ESCURO) => grupo([elipse(340), preenchimento(cor), contorno(borda, 10)])

// Coração com cerca de 280 de largura, centrado na origem
const formaCoracao = () => caminho(
  [[0, 130], [-140, -30], [0, -70], [140, -30]],
  [[60, -50], [0, 70], [-20, -80], [0, -80]],
  [[-60, -50], [0, -80], [20, -80], [0, 70]],
  true,
)

// Olho aberto, num dos lados do rosto
const olho = (x: number, largura = 40, altura = 56) => grupo([elipse(largura, altura), preenchimento(MARROM)], { posicao: [x, -40] })

// Boca sorrindo
const sorriso = (largura = 80, y = 40) => grupo([caminho([[-largura, y], [largura, y]], [[0, 0], [-largura / 2, 70]], [[largura / 2, 70], [0, 0]]), contorno(MARROM, 18)])

// Quadros que alternam entre dois valores, para animar em vai e volta
const vaiVolta = (a: number[], b: number[], ciclos = 2): Quadro[] =>
  Array.from({ length: ciclos * 2 + 1 }, (_, i) => ({ t: Math.round((i * DURACAO) / (ciclos * 2)), s: i % 2 ? b : a }))

// --- Figurinhas ---

const figurinhas: Record<string, object> = {
  coracao: figurinha('coracao', [
    camada('coracao', [grupo([formaCoracao(), preenchimento('#E8344E')])], {
      posicao: [0, -10],
      // Batida dupla, como um coração
      escala: animado([
        { t: 0, s: [100, 100] }, { t: 8, s: [118, 118] }, { t: 16, s: [100, 100] },
        { t: 24, s: [112, 112] }, { t: 32, s: [100, 100] }, { t: 60, s: [100, 100] },
      ]),
    }),
  ]),

  estrela: figurinha('estrela', [
    camada('brilho', [grupo([estrela(60, 22, 4), preenchimento('#FFF4C2')])], {
      posicao: [130, -130],
      escala: animado([{ t: 0, s: [0, 0] }, { t: 15, s: [100, 100] }, { t: 30, s: [0, 0] }, { t: 60, s: [0, 0] }]),
    }),
    camada('estrela', [grupo([estrela(190, 85), preenchimento('#FFC21A'), contorno('#E5A100', 10)])], {
      rotacao: animado([{ t: 0, s: [0] }, { t: 60, s: [72] }]),
      escala: animado([{ t: 0, s: [100, 100] }, { t: 30, s: [110, 110] }, { t: 60, s: [100, 100] }]),
    }),
  ]),

  sorriso: figurinha('sorriso', [
    camada('olhos', [
      grupo([elipse(40, 56), preenchimento(MARROM)], {
        posicao: [-60, -40],
        // Pisca no fim do ciclo
        escala: animado([{ t: 0, s: [100, 100] }, { t: 44, s: [100, 100] }, { t: 48, s: [100, 10] }, { t: 52, s: [100, 100] }, { t: 60, s: [100, 100] }]),
      }),
      grupo([elipse(40, 56), preenchimento(MARROM)], {
        posicao: [60, -40],
        escala: animado([{ t: 0, s: [100, 100] }, { t: 44, s: [100, 100] }, { t: 48, s: [100, 10] }, { t: 52, s: [100, 100] }, { t: 60, s: [100, 100] }]),
      }),
    ]),
    camada('boca', [grupo([caminho([[-80, 40], [80, 40]], [[0, 0], [-40, 70]], [[40, 70], [0, 0]]), contorno(MARROM, 18)])]),
    camada('rosto', [rosto()], {
      escala: animado([{ t: 0, s: [100, 100] }, { t: 30, s: [104, 104] }, { t: 60, s: [100, 100] }]),
    }),
  ]),

  risada: figurinha('risada', [
    camada('rosto', [
      grupo([caminho([[-95, -30], [-60, -60], [-25, -30]]), contorno(MARROM, 16)]),
      grupo([caminho([[25, -30], [60, -60], [95, -30]]), contorno(MARROM, 16)]),
      grupo([caminho([[-90, 20], [90, 20]], [[0, 120], [0, 0]], [[0, 0], [0, 120]], true), preenchimento('#8A1C2B')]),
      grupo([elipse(46, 64), preenchimento('#5BC0F8')], {
        posicao: [-150, -10],
        opacidade: animado([{ t: 0, s: [0] }, { t: 10, s: [100] }, { t: 50, s: [100] }, { t: 60, s: [0] }]),
      }),
      grupo([elipse(46, 64), preenchimento('#5BC0F8')], {
        posicao: [150, -10],
        opacidade: animado([{ t: 0, s: [0] }, { t: 10, s: [100] }, { t: 50, s: [100] }, { t: 60, s: [0] }]),
      }),
      rosto(),
    ], {
      // Balança de rir
      rotacao: animado([{ t: 0, s: [-8] }, { t: 15, s: [8] }, { t: 30, s: [-8] }, { t: 45, s: [8] }, { t: 60, s: [-8] }]),
      posicao: animado([{ t: 0, s: [0, 0] }, { t: 8, s: [0, -14] }, { t: 15, s: [0, 0] }, { t: 23, s: [0, -14] }, { t: 30, s: [0, 0] }, { t: 38, s: [0, -14] }, { t: 45, s: [0, 0] }, { t: 53, s: [0, -14] }, { t: 60, s: [0, 0] }]),
    }),
  ]),

  feito: figurinha('feito', [
    camada('visto', [grupo([caminho([[-85, 5], [-25, 65], [90, -60]]), contorno('#FFFFFF', 40), desenhar(10, 30)])]),
    camada('circulo', [grupo([elipse(360), preenchimento('#22B455')])], {
      escala: animado([{ t: 0, s: [0, 0] }, { t: 12, s: [108, 108] }, { t: 18, s: [100, 100] }, { t: 60, s: [100, 100] }]),
    }),
  ]),

  festa: figurinha('festa', [...Array.from({ length: 14 }, (_, i) => {
    const angulo = (i / 14) * Math.PI * 2
    const distancia = 150 + (i % 3) * 30
    const cores = ['#E8344E', '#FFC21A', '#22B455', '#3B82F6', '#A855F7', '#F97316']
    const destino: Ponto = [Math.round(Math.cos(angulo) * distancia), Math.round(Math.sin(angulo) * distancia) + 30]
    return camada(`confete-${i}`, [grupo([i % 2 ? retangulo(64, 30, 8) : elipse(46), preenchimento(cores[i % cores.length]!)])], {
      posicao: animado([{ t: 0, s: [0, 0] }, { t: 30, s: destino }, { t: 60, s: [destino[0], destino[1] + 40] }]),
      rotacao: animado([{ t: 0, s: [0] }, { t: 60, s: [i % 2 ? 360 : -360] }]),
      opacidade: animado([{ t: 0, s: [0] }, { t: 5, s: [100] }, { t: 45, s: [100] }, { t: 60, s: [0] }]),
    })
  }),
  // Bola no centro, que solta os confetes: a figurinha nunca fica vazia
  camada('bola', [
    grupo([elipse(56, 56, [-30, -30]), preenchimento('#FFFFFF')], { opacidade: 45 }),
    grupo([elipse(170), preenchimento('#A855F7')]),
  ], {
    posicao: [0, 30],
    escala: animado([{ t: 0, s: [80, 80] }, { t: 6, s: [115, 115] }, { t: 14, s: [100, 100] }, { t: 60, s: [80, 80] }]),
  })]),

  sono: figurinha('sono', [0, 14, 28].map((atraso, i) => {
    const tamanho = 40 + i * 18
    const z = caminho([[-tamanho, -tamanho], [tamanho, -tamanho], [-tamanho, tamanho], [tamanho, tamanho]])
    const inicio: Ponto = [-90 + i * 70, 120 - i * 40]
    return camada(`z-${i}`, [grupo([z, contorno('#6366F1', 16 + i * 4)])], {
      posicao: animado([{ t: 0, s: inicio }, { t: atraso, s: inicio }, { t: atraso + 20, s: [inicio[0] + 40, inicio[1] - 90] }, { t: 60, s: [inicio[0] + 40, inicio[1] - 90] }]),
      // Cada Z aparece no seu tempo e fica até o fim do ciclo
      opacidade: animado([{ t: 0, s: [0] }, { t: atraso, s: [0] }, { t: atraso + 6, s: [100] }, { t: 52, s: [100] }, { t: 60, s: [0] }]),
    })
  })),

  pontinhos: figurinha('pontinhos', [
    ...[-110, 0, 110].map((x, i) => camada(`ponto-${i}`, [grupo([elipse(70), preenchimento('#64748B')])], {
      posicao: animado([{ t: 0, s: [x, 0] }, { t: i * 8, s: [x, 0] }, { t: i * 8 + 10, s: [x, -50] }, { t: i * 8 + 20, s: [x, 0] }, { t: 60, s: [x, 0] }]),
    })),
    camada('balao', [grupo([retangulo(420, 220, 110), preenchimento('#E2E8F0')])]),
  ]),
}

// --- Pacote Rostos ---

const rostos: Record<string, object> = {
  piscadinha: figurinha('piscadinha', [
    camada('rosto', [
      olho(-60),
      grupo([caminho([[30, -40], [60, -55], [90, -40]]), contorno(MARROM, 14)], {
        // O olho direito pisca na primeira metade do ciclo
        opacidade: animado([{ t: 0, s: [100] }, { t: 30, s: [100] }, { t: 32, s: [0] }, { t: 60, s: [0] }]),
      }),
      grupo([elipse(40, 56), preenchimento(MARROM)], {
        posicao: [60, -40],
        opacidade: animado([{ t: 0, s: [0] }, { t: 30, s: [0] }, { t: 32, s: [100] }, { t: 60, s: [100] }]),
      }),
      sorriso(),
      rosto(),
    ], {
      rotacao: animado([{ t: 0, s: [-6] }, { t: 30, s: [6] }, { t: 60, s: [-6] }]),
    }),
  ]),

  triste: figurinha('triste', [
    camada('lagrima', [grupo([elipse(30, 44), preenchimento('#5BC0F8')])], {
      posicao: animado([{ t: 0, s: [-62, -5] }, { t: 45, s: [-62, 90] }, { t: 60, s: [-62, 90] }]),
      opacidade: animado([{ t: 0, s: [0] }, { t: 8, s: [100] }, { t: 40, s: [100] }, { t: 50, s: [0] }, { t: 60, s: [0] }]),
    }),
    camada('rosto', [
      // Sobrancelhas mais altas no meio
      grupo([caminho([[-95, -72], [-30, -92]]), contorno(MARROM, 12)]),
      grupo([caminho([[30, -92], [95, -72]]), contorno(MARROM, 12)]),
      olho(-60, 36, 48),
      olho(60, 36, 48),
      grupo([caminho([[-60, 85], [60, 85]], [[0, 0], [-30, -50]], [[30, -50], [0, 0]]), contorno(MARROM, 16)]),
      rosto(),
    ], {
      escala: animado([{ t: 0, s: [100, 100] }, { t: 30, s: [97, 103] }, { t: 60, s: [100, 100] }]),
    }),
  ]),

  surpreso: figurinha('surpreso', [
    camada('rosto', [
      grupo([elipse(54, 64), preenchimento(MARROM)], {
        posicao: [-60, -45],
        escala: animado([{ t: 0, s: [80, 80] }, { t: 8, s: [115, 115] }, { t: 20, s: [100, 100] }, { t: 60, s: [80, 80] }]),
      }),
      grupo([elipse(54, 64), preenchimento(MARROM)], {
        posicao: [60, -45],
        escala: animado([{ t: 0, s: [80, 80] }, { t: 8, s: [115, 115] }, { t: 20, s: [100, 100] }, { t: 60, s: [80, 80] }]),
      }),
      grupo([elipse(64, 84), preenchimento('#8A1C2B')], {
        posicao: [0, 70],
        escala: animado([{ t: 0, s: [60, 60] }, { t: 8, s: [110, 110] }, { t: 20, s: [100, 100] }, { t: 60, s: [60, 60] }]),
      }),
      rosto(),
    ], {
      posicao: animado([{ t: 0, s: [0, 0] }, { t: 6, s: [0, -24] }, { t: 14, s: [0, 0] }, { t: 60, s: [0, 0] }]),
    }),
  ]),

  bravo: figurinha('bravo', [
    camada('rosto', [
      grupo([caminho([[-105, -95], [-30, -60]]), contorno(MARROM, 16)]),
      grupo([caminho([[30, -60], [105, -95]]), contorno(MARROM, 16)]),
      olho(-60, 36, 40),
      olho(60, 36, 40),
      grupo([caminho([[-60, 80], [60, 80]], [[0, 0], [-30, -30]], [[30, -30], [0, 0]]), contorno(MARROM, 16)]),
      rosto('#F0563C', '#C2410C'),
    ], {
      // Treme de raiva
      posicao: animado(vaiVolta([-6, 0], [6, 0], 6)),
    }),
  ]),

  apaixonado: figurinha('apaixonado', [
    camada('rosto', [
      grupo([formaCoracao(), preenchimento('#E8344E')], {
        posicao: [-62, -40],
        escala: animado(vaiVolta([28, 28], [36, 36])),
      }),
      grupo([formaCoracao(), preenchimento('#E8344E')], {
        posicao: [62, -40],
        escala: animado(vaiVolta([28, 28], [36, 36])),
      }),
      sorriso(),
      rosto(),
    ], {
      rotacao: animado([{ t: 0, s: [-5] }, { t: 30, s: [5] }, { t: 60, s: [-5] }]),
    }),
  ]),

  legal: figurinha('legal', [
    camada('oculos', [
      grupo([caminho([[-95, -55], [-75, -35]]), contorno('#FFFFFF', 8)], { opacidade: 70 }),
      grupo([retangulo(110, 64, 22), preenchimento('#111827')], { posicao: [-62, -40] }),
      grupo([retangulo(110, 64, 22), preenchimento('#111827')], { posicao: [62, -40] }),
      grupo([caminho([[-10, -50], [10, -50]]), contorno('#111827', 12)]),
    ], {
      // Os óculos descem até os olhos e ficam
      posicao: animado([{ t: 0, s: [0, -200] }, { t: 16, s: [0, 0] }, { t: 60, s: [0, 0] }]),
      opacidade: animado([{ t: 0, s: [0] }, { t: 6, s: [100] }, { t: 60, s: [100] }]),
    }),
    camada('rosto', [
      grupo([caminho([[-60, 50], [70, 30]], [[0, 0], [-40, 50]], [[40, 60], [0, 0]]), contorno(MARROM, 18)]),
      rosto(),
    ]),
  ]),

  beijo: figurinha('beijo', [
    camada('coracao', [grupo([formaCoracao(), preenchimento('#E8344E')], { escala: [22, 22] })], {
      posicao: animado([{ t: 0, s: [40, 60] }, { t: 15, s: [40, 60] }, { t: 50, s: [150, -110] }, { t: 60, s: [150, -110] }]),
      opacidade: animado([{ t: 0, s: [0] }, { t: 15, s: [0] }, { t: 20, s: [100] }, { t: 45, s: [100] }, { t: 55, s: [0] }, { t: 60, s: [0] }]),
      escala: animado([{ t: 0, s: [60, 60] }, { t: 15, s: [60, 60] }, { t: 50, s: [140, 140] }, { t: 60, s: [140, 140] }]),
    }),
    camada('rosto', [
      grupo([caminho([[-90, -40], [-30, -40]], [[0, 0], [-30, 30]], [[30, 30], [0, 0]]), contorno(MARROM, 14)]),
      grupo([caminho([[30, -40], [90, -40]], [[0, 0], [-30, 30]], [[30, 30], [0, 0]]), contorno(MARROM, 14)]),
      grupo([elipse(46, 40), contorno(MARROM, 14)], { posicao: [15, 60] }),
      grupo([elipse(60, 36), preenchimento('#FB7185')], { posicao: [-100, 30], opacidade: 60 }),
      grupo([elipse(60, 36), preenchimento('#FB7185')], { posicao: [100, 30], opacidade: 60 }),
      rosto(),
    ], {
      escala: animado([{ t: 0, s: [100, 100] }, { t: 12, s: [104, 96] }, { t: 20, s: [100, 100] }, { t: 60, s: [100, 100] }]),
    }),
  ]),
}

// --- Pacote Coisas ---

// coisas/fogo.json não sai daqui: é uma animação pronta, copiada para
// public/figurinhas/coisas (só a escala da camada raiz foi reduzida a 72%,
// para ficar do tamanho das outras), e o script não mexe nela.
const coisas: Record<string, object> = {
  sol: figurinha('sol', [
    camada('centro', [grupo([elipse(200), preenchimento('#FFC21A'), contorno('#F59E0B', 10)])], {
      escala: animado([{ t: 0, s: [100, 100] }, { t: 30, s: [106, 106] }, { t: 60, s: [100, 100] }]),
    }),
    camada('raios', Array.from({ length: 8 }, (_, i) => {
      const angulo = (i / 8) * Math.PI * 2
      return grupo([retangulo(30, 76, 15), preenchimento('#FFC21A')], {
        posicao: [Math.round(Math.cos(angulo) * 165), Math.round(Math.sin(angulo) * 165)],
        rotacao: Math.round((angulo * 180) / Math.PI) + 90,
      })
    }), {
      // Oito raios: girar um oitavo de volta fecha o ciclo sem pulo
      rotacao: animado([{ t: 0, s: [0] }, { t: 60, s: [45] }]),
    }),
  ]),

  chuva: figurinha('chuva', [
    ...[-80, -40, 0, 40, 80].map((x, i) => {
      const inicio = (i * 11) % 30
      return camada(`gota-${i}`, [grupo([elipse(18, 38), preenchimento('#3B82F6')])], {
        posicao: animado([{ t: 0, s: [x, 70] }, { t: inicio, s: [x, 70] }, { t: inicio + 30, s: [x - 10, 210] }, { t: 60, s: [x - 10, 210] }]),
        opacidade: animado([{ t: 0, s: [0] }, { t: inicio, s: [0] }, { t: inicio + 4, s: [100] }, { t: inicio + 26, s: [100] }, { t: inicio + 30, s: [0] }, { t: 60, s: [0] }]),
      })
    }),
    camada('nuvem', [
      grupo([elipse(160, 130, [-80, 0]), elipse(190, 170, [20, -40]), elipse(140, 120, [100, 10]), retangulo(330, 90, 45), preenchimento('#CBD5E1')]),
    ], {
      posicao: animado(vaiVolta([-8, -40], [8, -40])),
    }),
  ]),

  cafe: figurinha('cafe', [
    ...[-45, 0, 45].map((x, i) => camada(`vapor-${i}`, [grupo([
      caminho([[0, 0], [0, -110]], [[0, 0], [30, 30]], [[-30, -40], [0, 0]]),
      contorno('#94A3B8', 14),
      desenhar(i * 8, i * 8 + 25),
    ])], {
      posicao: [x, -30],
      opacidade: animado([{ t: 0, s: [0] }, { t: i * 8, s: [0] }, { t: i * 8 + 6, s: [80] }, { t: 50, s: [80] }, { t: 60, s: [0] }]),
    })),
    camada('xicara', [
      grupo([elipse(200, 30), preenchimento('#6B3F1D')], { posicao: [0, 18] }),
      grupo([elipse(80, 90), contorno('#E2E8F0', 22)], { posicao: [125, 80] }),
      grupo([retangulo(230, 180, 40), preenchimento('#F8FAFC')], { posicao: [0, 95] }),
      grupo([elipse(340, 54), preenchimento('#94A3B8')], { posicao: [0, 190] }),
    ]),
  ]),

  presente: figurinha('presente', [
    camada('tampa', [
      grupo([elipse(80, 50), preenchimento('#FACC15')], { posicao: [-40, -95], rotacao: -25 }),
      grupo([elipse(80, 50), preenchimento('#FACC15')], { posicao: [40, -95], rotacao: 25 }),
      grupo([retangulo(44, 64), preenchimento('#FACC15')], { posicao: [0, -40] }),
      grupo([retangulo(300, 64, 10), preenchimento('#B91C1C')], { posicao: [0, -40] }),
    ], {
      // A tampa pula mais alto que a caixa
      posicao: animado([{ t: 0, s: [0, 0] }, { t: 10, s: [0, -50] }, { t: 20, s: [0, 0] }, { t: 30, s: [0, -50] }, { t: 40, s: [0, 0] }, { t: 60, s: [0, 0] }]),
      rotacao: animado([{ t: 0, s: [0] }, { t: 10, s: [-6] }, { t: 20, s: [0] }, { t: 30, s: [6] }, { t: 40, s: [0] }, { t: 60, s: [0] }]),
    }),
    camada('caixa', [
      grupo([retangulo(44, 190), preenchimento('#FACC15')], { posicao: [0, 85] }),
      grupo([retangulo(260, 190, 10), preenchimento('#E8344E')], { posicao: [0, 85] }),
    ], {
      posicao: animado([{ t: 0, s: [0, 0] }, { t: 10, s: [0, -16] }, { t: 20, s: [0, 0] }, { t: 30, s: [0, -16] }, { t: 40, s: [0, 0] }, { t: 60, s: [0, 0] }]),
    }),
  ]),

  balao: figurinha('balao', [
    camada('balao', [
      grupo([elipse(50, 80), preenchimento('#FFFFFF')], { posicao: [-50, -110], rotacao: 20, opacidade: 40 }),
      grupo([elipse(220, 270), preenchimento('#E8344E')], { posicao: [0, -60] }),
      grupo([caminho([[-16, 90], [16, 90], [0, 72]], [], [], true), preenchimento('#BE123C')]),
      grupo([caminho([[0, 90], [0, 230]], [[0, 0], [-40, -40]], [[40, 40], [0, 0]]), contorno('#64748B', 6)]),
    ], {
      posicao: animado(vaiVolta([0, 0], [0, -24])),
      rotacao: animado(vaiVolta([-5], [5])),
    }),
  ]),

  bolo: figurinha('bolo', [
    camada('chama', [grupo([elipse(16, 26), preenchimento('#FDE047')], { posicao: [0, 8] }), grupo([elipse(34, 52), preenchimento('#F97316')])], {
      posicao: [0, -110],
      escala: animado(vaiVolta([100, 100], [85, 115], 4)),
    }),
    camada('bolo', [
      grupo([retangulo(26, 90, 6), preenchimento('#60A5FA')], { posicao: [0, -45] }),
      grupo([retangulo(300, 40, 20), preenchimento('#FFF7ED')], { posicao: [0, 10] }),
      grupo([retangulo(280, 26), preenchimento('#BE185D')], { posicao: [0, 110] }),
      grupo([retangulo(280, 150, 16), preenchimento('#F472B6')], { posicao: [0, 95] }),
      grupo([elipse(360, 50), preenchimento('#CBD5E1')], { posicao: [0, 175] }),
    ]),
  ]),

  'coracao-partido': figurinha('coracao-partido', [
    camada('esquerda', [grupo([
      caminho(
        [[0, -70], [-22, -10], [14, 45], [0, 130], [-140, -30]],
        [[-20, -80], [0, 0], [0, 0], [0, 0], [0, 70]],
        [[0, 0], [0, 0], [0, 0], [-60, -50], [0, -80]],
        true,
      ),
      preenchimento('#E8344E'),
    ])], {
      posicao: animado([{ t: 0, s: [0, -10] }, { t: 10, s: [0, -10] }, { t: 22, s: [-24, 0] }, { t: 48, s: [-24, 0] }, { t: 60, s: [0, -10] }]),
      rotacao: animado([{ t: 0, s: [0] }, { t: 10, s: [0] }, { t: 22, s: [-12] }, { t: 48, s: [-12] }, { t: 60, s: [0] }]),
    }),
    camada('direita', [grupo([
      caminho(
        [[0, -70], [140, -30], [0, 130], [14, 45], [-22, -10]],
        [[0, 0], [0, -80], [60, -50], [0, 0], [0, 0]],
        [[20, -80], [0, 70], [0, 0], [0, 0], [0, 0]],
        true,
      ),
      preenchimento('#E8344E'),
    ])], {
      posicao: animado([{ t: 0, s: [0, -10] }, { t: 10, s: [0, -10] }, { t: 22, s: [24, 0] }, { t: 48, s: [24, 0] }, { t: 60, s: [0, -10] }]),
      rotacao: animado([{ t: 0, s: [0] }, { t: 10, s: [0] }, { t: 22, s: [12] }, { t: 48, s: [12] }, { t: 60, s: [0] }]),
    }),
  ]),

  joinha: figurinha('joinha', [
    camada('mao', [
      // Dedos dobrados, empilhados à direita da palma (o de cima por cima)
      ...[[-28, 116], [24, 110], [76, 102], [126, 90]].map(([y, largura]) =>
        grupo([retangulo(largura!, 50, 25), preenchimento(AMARELO), contorno(AMARELO_ESCURO, 8)], { posicao: [40 + largura! / 2, y!] })),
      // Polegar (para cima, levemente inclinado) e palma como uma peça só: os
      // preenchimentos ficam por cima dos contornos e escondem a emenda. O
      // contorno sai com a metade de fora, por isso a largura em dobro.
      grupo([retangulo(76, 150, 38), preenchimento(AMARELO)], { posicao: [-5, -85], rotacao: 10 }),
      grupo([retangulo(190, 220, 56), preenchimento(AMARELO)], { posicao: [-5, 50] }),
      grupo([retangulo(76, 150, 38), contorno(AMARELO_ESCURO, 16)], { posicao: [-5, -85], rotacao: 10 }),
      grupo([retangulo(190, 220, 56), contorno(AMARELO_ESCURO, 16)], { posicao: [-5, 50] }),
      // Punho da manga
      grupo([retangulo(56, 250, 14), preenchimento('#60A5FA')], { posicao: [-120, 50] }),
      grupo([retangulo(80, 270, 16), preenchimento('#2563EB')], { posicao: [-160, 50] }),
    ], {
      posicao: [20, 10],
      escala: animado([{ t: 0, s: [90, 90] }, { t: 8, s: [108, 108] }, { t: 16, s: [100, 100] }, { t: 60, s: [90, 90] }]),
      rotacao: animado([{ t: 0, s: [0] }, { t: 8, s: [-10] }, { t: 18, s: [4] }, { t: 26, s: [0] }, { t: 60, s: [0] }]),
    }),
  ]),
}

const pacotes: Record<string, Record<string, object>> = { basico: figurinhas, rostos, coisas }

let total = 0
for (const [pacote, lista] of Object.entries(pacotes)) {
  const pasta = join(import.meta.dir, '..', 'public', 'figurinhas', pacote)
  mkdirSync(pasta, { recursive: true })
  for (const [nome, dados] of Object.entries(lista)) {
    writeFileSync(join(pasta, `${nome}.json`), JSON.stringify(dados))
    total++
  }
}
console.log(`${total} figurinhas geradas em public/figurinhas`)
