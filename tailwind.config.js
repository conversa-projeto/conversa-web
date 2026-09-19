// As cores ficam em variaveis CSS (style.css), que a aba Cores das
// configuracoes pode trocar em tempo de execucao. Uma variavel com hex nao
// aceita o modificador de opacidade do Tailwind (bg-surface-900/50), entao
// com opacidade a cor e misturada com transparente via color-mix.
function cor(variavel) {
  return ({ opacityValue }) => opacityValue === undefined
    ? `var(${variavel})`
    : `color-mix(in srgb, var(${variavel}) calc(${opacityValue} * 100%), transparent)`
}

function escala(nome, tons) {
  return Object.fromEntries(tons.map((tom) => [tom, cor(`--color-${nome}-${tom}`)]))
}

const TONS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: escala('surface', ['base', 'inverted', ...TONS, '950']),
        primary: escala('primary', TONS),
        success: escala('success', TONS),
        danger: escala('danger', TONS),
        info: escala('info', TONS),
        warning: escala('warning', TONS),
        chamada: escala('chamada', ['300', '500', '600', '700', '800', '900']),
      }
    }
  },
  plugins: []
}
