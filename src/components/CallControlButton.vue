<template>
  <button
    class="flex items-center justify-center transition-all duration-200 focus:outline-none"
    :class="[
      sizeClasses,
      variantClasses,
      { 'rounded-full': rounded },
      { 'opacity-50 cursor-not-allowed': disabled }
    ]"
    :title="title"
    :disabled="disabled"
    :role="ehSwitch ? 'switch' : undefined"
    :aria-checked="ehSwitch ? active : undefined"
    @click="emit('click')"
  >
    <slot>
      <!-- Default Leave Call Icon if none provided -->
      <svg
        v-if="icon === 'leave'"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-miterlimit="10"
        class="icon-size"
      >
        <g transform="translate(2 8)">
          <path
            d="M7.02,15.976,5.746,13.381a.7.7,0,0,0-.579-.407l-1.032-.056a.662.662,0,0,1-.579-.437,9.327,9.327,0,0,1,0-6.5.662.662,0,0,1,.579-.437l1.032-.109a.7.7,0,0,0,.589-.394L7.03,2.446l.331-.662a.708.708,0,0,0,.07-.308.692.692,0,0,0-.179-.467A3,3,0,0,0,4.693.017l-.235.03L4.336.063A1.556,1.556,0,0,0,4.17.089l-.162.04C1.857.679.165,4.207,0,8.585V9.83c.165,4.372,1.857,7.9,4,8.483l.162.04a1.556,1.556,0,0,0,.165.026l.122.017.235.03a3,3,0,0,0,2.558-.993.692.692,0,0,0,.179-.467.708.708,0,0,0-.07-.308Z"
            transform="translate(18.936 0.506) rotate(90)"
          />
        </g>
      </svg>
    </slot>
    <!-- Liga/desliga: a chave ao lado do ícone mostra o estado -->
    <span
      v-if="ehSwitch"
      aria-hidden="true"
      data-chave
      class="relative shrink-0 rounded-full transition-colors duration-200"
      :class="[chave.trilho, active ? 'bg-success-500' : 'bg-chamada-500']"
    >
      <span
        class="absolute left-0.5 top-0.5 rounded-full bg-white shadow transition-transform duration-200"
        :class="[chave.bolinha, active ? chave.ligada : '']"
      ></span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  icon?: string
  // alternar: microfone, câmera, som; destaque: tela, chat, ponteiro (os dois
  // com chave de liga/desliga); secondary: ações, sempre neutro
  variant?: 'danger' | 'primary' | 'secondary' | 'success' | 'ghost' | 'alternar' | 'destaque'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  active?: boolean
  rounded?: boolean
  disabled?: boolean
  title?: string
}>(), {
  variant: 'secondary',
  size: 'md',
  active: false,
  rounded: true,
  disabled: false
})

const emit = defineEmits<{
  'click': []
}>()

// alternar (microfone, câmera, som) e destaque (tela, chat, ponteiro) são
// liga/desliga: viram uma pílula com o ícone e uma chave
const ehSwitch = computed(() => props.variant === 'alternar' || props.variant === 'destaque')

const chave = computed(() => {
  switch (props.size) {
    case 'xs': return { trilho: 'h-3.5 w-6', bolinha: 'h-2.5 w-2.5', ligada: 'translate-x-2.5' }
    case 'sm': return { trilho: 'h-4 w-7', bolinha: 'h-3 w-3', ligada: 'translate-x-3' }
    case 'lg': return { trilho: 'h-6 w-11', bolinha: 'h-5 w-5', ligada: 'translate-x-5' }
    default: return { trilho: 'h-[18px] w-8', bolinha: 'h-[14px] w-[14px]', ligada: 'translate-x-[14px]' }
  }
})

const sizeClasses = computed(() => {
  if (ehSwitch.value) {
    switch (props.size) {
      case 'xs': return 'h-7 gap-1 pl-1.5 pr-1'
      case 'sm': return 'h-8 gap-1.5 pl-2 pr-1.5'
      case 'lg': return 'h-14 gap-2.5 pl-3 pr-2.5'
      default: return 'h-10 gap-2 pl-2.5 pr-2'
    }
  }
  switch (props.size) {
    case 'xs': return 'h-7 w-7 p-1'
    case 'sm': return 'h-8 w-8 p-1.5'
    case 'md': return 'h-10 w-10 p-2'
    case 'lg': return 'h-14 w-14 p-3'
    default: return 'h-10 w-10'
  }
})

const variantClasses = computed(() => {
  if (props.variant === 'danger') {
    return 'bg-danger-500 text-white hover:bg-danger-600'
  }
  if (props.variant === 'primary') {
    return 'bg-primary-600 text-white hover:bg-primary-700'
  }
  if (props.variant === 'success') {
    return 'bg-success-500 text-white hover:bg-success-600'
  }
  if (props.variant === 'ghost') {
    return 'bg-transparent text-white hover:bg-chamada-700/50'
  }
  // Cores fixas da chamada: não mudam com o tema claro ou escuro do app. Nos
  // liga/desliga, quem mostra o estado é a chave
  return 'bg-chamada-700 text-white hover:bg-chamada-600'
})
</script>

<style scoped>
.icon-size {
  @apply h-full w-full;
}

/* Adjusting sizes for the icons inside the slots */
button.h-7 :deep(svg) { width: 17px; height: 17px; }
button.h-8 :deep(svg) { width: 19px; height: 19px; }
button.h-10 :deep(svg) { width: 24px; height: 24px; }
button.h-14 :deep(svg) { width: 34px; height: 34px; }
</style>
