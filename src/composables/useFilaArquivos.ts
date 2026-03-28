import { ref } from 'vue'

export interface ArquivoNaFila {
  id: string
  file: Blob
  nome: string
  tipo: string
  isAudio: boolean
  isGravacaoAudio?: boolean
  isImagem?: boolean
  previewUrl?: string
  duracaoSegundos?: number | null
  reproduzindo?: boolean
}

export function useFilaArquivos() {
  const arquivosFila = ref<ArquivoNaFila[]>([])
  const playersAudioPreview = new Map<string, HTMLAudioElement>()
  let audioPreviewTocandoId: string | null = null

  function gerarIdArquivo() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
    return `arq-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  function atualizarArquivoFila(id: string, patch: Partial<ArquivoNaFila>) {
    arquivosFila.value = arquivosFila.value.map((arq) => (arq.id === id ? { ...arq, ...patch } : arq))
  }

  async function obterDuracaoViaDecode(file: Blob): Promise<number | null> {
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return null
      const ctx = new AudioCtx()
      try {
        const data = await file.arrayBuffer()
        const decoded = await ctx.decodeAudioData(data.slice(0))
        if (!Number.isFinite(decoded.duration)) return null
        return Math.max(0, Math.round(decoded.duration))
      } finally {
        await ctx.close()
      }
    } catch {
      return null
    }
  }

  function carregarDuracaoAudio(id: string, file: Blob, previewUrl: string) {
    const audio = new Audio()
    audio.preload = 'metadata'
    let finalizado = false

    const finalizar = async (duracao: number | null) => {
      if (finalizado) return
      finalizado = true
      if (duracao != null) {
        atualizarArquivoFila(id, { duracaoSegundos: duracao })
      } else {
        const viaDecode = await obterDuracaoViaDecode(file)
        atualizarArquivoFila(id, { duracaoSegundos: viaDecode })
      }
      audio.src = ''
    }

    const timeout = setTimeout(() => void finalizar(null), 1200)

    audio.onloadedmetadata = () => {
      clearTimeout(timeout)
      const duracao = Number.isFinite(audio.duration) ? Math.max(0, Math.round(audio.duration)) : null
      void finalizar(duracao)
    }

    audio.ondurationchange = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
      clearTimeout(timeout)
      void finalizar(Math.max(0, Math.round(audio.duration)))
    }

    audio.onerror = () => {
      clearTimeout(timeout)
      void finalizar(null)
    }

    audio.src = previewUrl
    audio.load()
  }

  function criarArquivoFila(file: Blob, nome: string, tipo: string, isAudio: boolean, isGravacaoAudio = false): ArquivoNaFila {
    const isImagem = tipo.startsWith('image/')
    const item: ArquivoNaFila = {
      id: gerarIdArquivo(),
      file,
      nome,
      tipo,
      isAudio,
      isGravacaoAudio,
      isImagem,
      previewUrl: (isAudio || isImagem) ? URL.createObjectURL(file) : undefined,
      duracaoSegundos: isAudio ? null : undefined,
      reproduzindo: false
    }

    if (item.isAudio && item.previewUrl) carregarDuracaoAudio(item.id, item.file, item.previewUrl)
    return item
  }

  function limparRecursosArquivo(arq: ArquivoNaFila) {
    if (arq.previewUrl) URL.revokeObjectURL(arq.previewUrl)
    const player = playersAudioPreview.get(arq.id)
    if (player) {
      player.pause()
      player.src = ''
      playersAudioPreview.delete(arq.id)
    }
    if (audioPreviewTocandoId === arq.id) audioPreviewTocandoId = null
  }

  function pararPreviewAtual() {
    if (!audioPreviewTocandoId) return
    const audioAtual = playersAudioPreview.get(audioPreviewTocandoId)
    if (audioAtual) {
      audioAtual.pause()
      audioAtual.currentTime = 0
    }
    atualizarArquivoFila(audioPreviewTocandoId, { reproduzindo: false })
    audioPreviewTocandoId = null
  }

  async function alternarPreviewAudio(id: string, onErro: (msg: string) => void) {
    const item = arquivosFila.value.find((arq) => arq.id === id)
    if (!item || !item.isAudio || !item.previewUrl) return

    let player = playersAudioPreview.get(id)
    if (!player) {
      player = new Audio(item.previewUrl)
      player.preload = 'metadata'
      player.onended = () => {
        atualizarArquivoFila(id, { reproduzindo: false })
        if (audioPreviewTocandoId === id) audioPreviewTocandoId = null
      }
      playersAudioPreview.set(id, player)
    }

    if (audioPreviewTocandoId && audioPreviewTocandoId !== id) pararPreviewAtual()

    if (!player.paused && audioPreviewTocandoId === id) {
      player.pause()
      atualizarArquivoFila(id, { reproduzindo: false })
      audioPreviewTocandoId = null
      return
    }

    try {
      await player.play()
      atualizarArquivoFila(id, { reproduzindo: true })
      audioPreviewTocandoId = id
    } catch {
      onErro('Não foi possível reproduzir o áudio da fila.')
    }
  }

  function removerArquivoFila(id: string) {
    const item = arquivosFila.value.find((arq) => arq.id === id)
    if (item) limparRecursosArquivo(item)
    arquivosFila.value = arquivosFila.value.filter((arq) => arq.id !== id)
  }

  function adicionarArquivos(files: FileList) {
    const novos: ArquivoNaFila[] = []
    for (const file of files) {
      const isAudio = file.type.startsWith('audio/')
      novos.push(criarArquivoFila(file, file.name, file.type, isAudio, false))
    }
    if (novos.length) arquivosFila.value = [...arquivosFila.value, ...novos]
  }

  function limparTudo() {
    pararPreviewAtual()
    arquivosFila.value.forEach((arq) => limparRecursosArquivo(arq))
    arquivosFila.value = []
    playersAudioPreview.clear()
  }

  return {
    arquivosFila,
    criarArquivoFila,
    limparRecursosArquivo,
    pararPreviewAtual,
    alternarPreviewAudio,
    removerArquivoFila,
    adicionarArquivos,
    limparTudo
  }
}
