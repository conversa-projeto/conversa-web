// Copia a imagem da URL para a área de transferência, em PNG (único formato de
// imagem que o navegador aceita ali). A imagem vai como promessa, criada ainda
// dentro do clique: esperar o download antes de gravar faz o navegador recusar
// a cópia por não ser mais uma ação do usuário.
export function copiarImagem(url: string) {
  const png = fetch(url)
    .then((resposta) => resposta.blob())
    .then((blob) => (blob.type === 'image/png' ? blob : converterParaPng(blob)))
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
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

// Onde foi o clique direito que abriu o menu: numa imagem, no texto, ou em
// nenhum conteúdo (menu aberto pelo botão)
export type AlvoCopia = { tipo: 'imagem'; url: string } | { tipo: 'texto' } | null
