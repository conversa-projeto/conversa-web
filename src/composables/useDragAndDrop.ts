import { ref } from 'vue'
import { arrastoNoCampo } from '../editor/pecas'

export function useDragAndDrop(onFilesDropped: (files: FileList) => void) {
  const isDragging = ref(false)
  let dragCounter = 0

  // Peça arrastada de dentro do campo de mensagem (mudando a ordem) não é
  // arquivo chegando: o Chrome a anuncia como arquivo, mas o aviso não vale
  const ehArquivoDeFora = (event: DragEvent) => !arrastoNoCampo.ativo && !!event.dataTransfer?.types.includes('Files')

  function onDragEnter(event: DragEvent) {
    event.preventDefault()
    if (ehArquivoDeFora(event)) {
      dragCounter++
      isDragging.value = true
    }
  }

  function onDragLeave(event: DragEvent) {
    event.preventDefault()
    if (ehArquivoDeFora(event)) {
      dragCounter--
      if (dragCounter <= 0) {
        dragCounter = 0
        isDragging.value = false
      }
    }
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    isDragging.value = false
    dragCounter = 0

    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      onFilesDropped(files)
    }
  }

  return {
    isDragging,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop
  }
}
