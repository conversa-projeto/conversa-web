// Copia a imagem da URL para a área de transferência, em PNG (único formato de
// imagem que o navegador aceita ali). A imagem vai como promessa, criada ainda
// dentro do clique: esperar o download antes de gravar faz o navegador recusar
// a cópia por não ser mais uma ação do usuário.
// Junto vai um HTML com a imagem original (data URL): no PNG um GIF perde a
// animação (fica só o primeiro quadro), e pelo HTML ele chega inteiro ao colar
// no próprio Conversa (gifDoHtml) e nos apps que aceitam HTML.
export function copiarImagem(url: string) {
  const original = fetch(url).then((resposta) => resposta.blob())
  const png = original.then((blob) => (blob.type === 'image/png' ? blob : converterParaPng(blob)))
  const html = original.then(async (blob) => new Blob([`<img src="${await dataUrl(blob)}">`], { type: 'text/html' }))
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': png, 'text/html': html })])
}

async function converterParaPng(blob: Blob) {
  const imagem = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = imagem.width
  canvas.height = imagem.height
  canvas.getContext('2d')!.drawImage(imagem, 0, 0)
  imagem.close()
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((png) => (png ? resolve(png) : reject(new Error('Falha ao converter a imagem'))), 'image/png')
  })
}

function dataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result))
    leitor.onerror = () => reject(leitor.error)
    leitor.readAsDataURL(blob)
  })
}

// GIF que veio no HTML colado (de copiarImagem, ou de outro app): o arquivo
// PNG que o navegador entrega junto tem só o primeiro quadro
export function gifDoHtml(html: string): File | null {
  const achado = /<img[^>]+src=["']data:image\/gif;base64,([^"']+)["']/i.exec(html)
  if (!achado?.[1]) return null
  try {
    const binario = atob(achado[1])
    const bytes = new Uint8Array(binario.length)
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
    return new File([bytes], `gif-${Date.now()}.gif`, { type: 'image/gif' })
  } catch {
    return null
  }
}

// Onde foi o clique direito que abriu o menu: numa imagem, no texto, ou em
// nenhum conteúdo (menu aberto pelo botão)
export type AlvoCopia = { tipo: 'imagem'; url: string } | { tipo: 'texto' } | null
