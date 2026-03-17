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
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  icon?: string
  variant?: 'danger' | 'primary' | 'secondary' | 'success' | 'ghost'
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

const sizeClasses = computed(() => {
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
    return 'bg-transparent text-white hover:bg-slate-700/50'
  }
  // Secondary / Gray (Active state toggles)
  if (props.active) {
    return 'bg-slate-700 text-white hover:bg-slate-600'
  }
  return 'bg-surface-600 text-surface-400 hover:bg-surface-500 hover:text-white'
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
