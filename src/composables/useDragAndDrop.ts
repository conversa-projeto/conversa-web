import { ref } from 'vue'

export function useDragAndDrop(onFilesDropped: (files: FileList) => void) {
  const isDragging = ref(false)
  let dragCounter = 0

  function onDragEnter(event: DragEvent) {
    event.preventDefault()
    if (event.dataTransfer?.types.includes('Files')) {
      dragCounter++
      isDragging.value = true
    }
  }

  function onDragLeave(event: DragEvent) {
    event.preventDefault()
    if (event.dataTransfer?.types.includes('Files')) {
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
