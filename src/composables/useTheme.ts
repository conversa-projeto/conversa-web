import { ref, watch } from 'vue'

const isDark = ref(false)

function init() {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        isDark.value = true
    }
    apply()
}

function apply() {
    document.documentElement.classList.toggle('dark', isDark.value)
}

function toggle() {
    isDark.value = !isDark.value
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    apply()
}

// Initialize on first import
init()

watch(isDark, apply)

export function useTheme() {
    return { isDark, toggle }
}
