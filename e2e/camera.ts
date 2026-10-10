import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Vídeo da câmera falsa: faixas que andam, em Y4M (o formato que o Chromium lê
// com --use-file-for-fake-video-capture). A câmera falsa padrão do Edge se
// encerra sozinha depois de alguns segundos; a de arquivo continua no ar.
const ARQUIVO = fileURLToPath(new URL('./.midia/camera.y4m', import.meta.url))

export function arquivoDaCamera() {
  if (existsSync(ARQUIVO)) return ARQUIVO
  const largura = 320
  const altura = 240
  const quadros = 30
  const partes = [Buffer.from(`YUV4MPEG2 W${largura} H${altura} F15:1 Ip A1:1 C420jpeg\n`)]
  for (let quadro = 0; quadro < quadros; quadro++) {
    const luminancia = Buffer.alloc(largura * altura)
    for (let linha = 0; linha < altura; linha++) {
      for (let coluna = 0; coluna < largura; coluna++) luminancia[linha * largura + coluna] = ((coluna + quadro * 8) % 64) * 4
    }
    partes.push(Buffer.from('FRAME\n'), luminancia, Buffer.alloc(largura * altura / 4, 90), Buffer.alloc(largura * altura / 4, 200))
  }
  mkdirSync(fileURLToPath(new URL('./.midia/', import.meta.url)), { recursive: true })
  writeFileSync(ARQUIVO, Buffer.concat(partes))
  return ARQUIVO
}
