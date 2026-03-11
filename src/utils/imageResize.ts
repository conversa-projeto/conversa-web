export function redimensionarImagem(blob: Blob, maxSize = 256): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Croppa quadrado central
      const menor = Math.min(img.width, img.height)
      const sx = (img.width - menor) / 2
      const sy = (img.height - menor) / 2

      const canvas = document.createElement('canvas')
      canvas.width = maxSize
      canvas.height = maxSize

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas não suportado'))
        return
      }

      ctx.drawImage(img, sx, sy, menor, menor, 0, 0, maxSize, maxSize)

      canvas.toBlob(
        (result) => {
          if (result) resolve(result)
          else reject(new Error('Falha ao gerar imagem'))
        },
        'image/jpeg',
        0.85
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Falha ao carregar imagem'))
    }

    img.src = url
  })
}
