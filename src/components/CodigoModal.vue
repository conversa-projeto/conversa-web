<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="emit('close')">
    <div class="mx-4 flex w-full max-w-2xl flex-col rounded-xl bg-surface-base shadow-2xl dark:bg-surface-800">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-surface-200 px-5 py-3 dark:border-surface-700">
        <h3 class="text-sm font-semibold text-surface-800 dark:text-surface-100">Inserir código</h3>
        <button class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200" @click="emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <!-- Linguagem -->
      <div class="border-b border-surface-200 px-5 py-3 dark:border-surface-700">
        <select
          v-model="linguagem"
          class="w-full rounded-lg border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-500 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100"
        >
          <option v-for="lang in linguagens" :key="lang" :value="lang">{{ lang }}</option>
        </select>
      </div>

      <!-- CodeMirror editor -->
      <div class="px-5 py-3">
        <div ref="editorContainer" class="h-64 overflow-hidden rounded-lg border border-surface-200 dark:border-surface-600" />
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end border-t border-surface-200 px-5 py-3 dark:border-surface-700">
        <div class="flex gap-2">
          <button
            class="rounded-lg px-4 py-1.5 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            class="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            :disabled="!temCodigo"
            @click="inserir"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { useTheme } from '../composables/useTheme'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { csharp } from '@codemirror/legacy-modes/mode/clike'
import { pascal } from '@codemirror/legacy-modes/mode/pascal'

const emit = defineEmits<{
  inserir: [payload: { linguagem: string; codigo: string }]
  close: []
}>()

const linguagens = ['texto', 'javascript', 'typescript', 'python', 'sql', 'json', 'html', 'css', 'bash', 'csharp', 'pascal']
const linguagem = ref('texto')
const editorContainer = ref<HTMLElement>()
const codigo = ref('')
const temCodigo = computed(() => codigo.value.trim().length > 0)

const { isDark } = useTheme()
const editorView = shallowRef<EditorView>()
const langCompartment = new Compartment()
const themeCompartment = new Compartment()

function getLangExtension(lang: string) {
  switch (lang) {
    case 'javascript': return javascript()
    case 'typescript': return javascript({ typescript: true })
    case 'python': return python()
    case 'sql': return sql()
    case 'json': return json()
    case 'html': return html()
    case 'css': return css()
    case 'bash': return StreamLanguage.define(shell)
    case 'csharp': return StreamLanguage.define(csharp)
    case 'pascal': return StreamLanguage.define(pascal)
    default: return []
  }
}

const lightTheme = EditorView.theme({
  '&': { backgroundColor: '#f8fafc' },
  '.cm-gutters': { backgroundColor: '#f1f5f9', color: '#94a3b8', borderRight: '1px solid #e2e8f0' },
  '.cm-activeLineGutter': { backgroundColor: '#e2e8f0' },
  '.cm-activeLine': { backgroundColor: '#f1f5f9' },
  '.cm-selectionBackground': { backgroundColor: '#bfdbfe !important' },
  '.cm-cursor': { borderLeftColor: '#334155' }
}, { dark: false })

function getThemeExtension() {
  return isDark.value ? oneDark : lightTheme
}

watch(linguagem, (lang) => {
  editorView.value?.dispatch({
    effects: langCompartment.reconfigure(getLangExtension(lang))
  })
})

watch(isDark, () => {
  editorView.value?.dispatch({
    effects: themeCompartment.reconfigure(getThemeExtension())
  })
})

function inserir() {
  if (!codigo.value.trim()) return
  emit('inserir', { linguagem: linguagem.value, codigo: codigo.value })
}

onMounted(() => {
  if (!editorContainer.value) return

  const editorTheme = EditorView.theme({
    '&': { height: '100%', fontSize: '13px' },
    '.cm-scroller': { overflow: 'auto' },
    '.cm-focused': { outline: 'none' }
  })

  const state = EditorState.create({
    doc: '',
    extensions: [
      basicSetup,
      themeCompartment.of(getThemeExtension()),
      editorTheme,
      langCompartment.of(getLangExtension(linguagem.value)),
      cmPlaceholder('Cole ou escreva seu código aqui...'),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          codigo.value = update.state.doc.toString()
        }
      }),
      keymap.of([{
        key: 'Mod-Enter',
        run: () => { inserir(); return true }
      }])
    ]
  })

  editorView.value = new EditorView({
    state,
    parent: editorContainer.value
  })

  editorView.value.focus()
})

onBeforeUnmount(() => {
  editorView.value?.destroy()
})
</script>
