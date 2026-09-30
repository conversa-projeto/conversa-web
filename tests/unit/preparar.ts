// Carregado antes dos testes (bunfig.toml): uma página simulada (happy-dom) e a
// leitura dos arquivos .vue, que o Bun não conhece.
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { beforeEach, mock } from 'bun:test'
import { plugin } from 'bun'
import { compileScript, parse } from 'vue/compiler-sfc'

GlobalRegistrator.register({ url: 'https://localhost/' })

// O Firebase Messaging exige service worker e roda ao ser importado: nos testes,
// uma versão que não faz nada (o token do push vem nulo).
mock.module('firebase/app', () => ({ initializeApp: () => ({}) }))
mock.module('firebase/messaging', () => ({ getMessaging: () => ({}), getToken: async () => '', onMessage: () => () => {} }))

// Sem servidor SIP nos testes: sip.js falso, controlado por cada teste
const { moduloSipFalso, limparSipFalso } = await import('./sipFalso')
mock.module('sip.js', () => moduloSipFalso)

// Compila cada .vue como o plugin do Vite faria: <script setup> com o template
// embutido. O CSS fica de fora (não importa para os testes).
plugin({
  name: 'vue',
  setup(build) {
    build.onLoad({ filter: /\.vue$/ }, async ({ path }) => {
      const { descriptor, errors } = parse(await Bun.file(path).text(), { filename: path })
      if (errors.length) throw errors[0]
      const id = new Bun.CryptoHasher('md5').update(path).digest('hex').slice(0, 8)
      const script = compileScript(descriptor, { id, inlineTemplate: true, isProd: false })
      return { contents: script.content, loader: 'ts' }
    })
  },
})

// API e WebSocket falsos para as stores, limpos antes de cada teste
const { limparApiFalsa } = await import('./apiFalsa')
beforeEach(() => {
  limparApiFalsa()
  limparSipFalso()
  localStorage.clear()
})

// As stores registram no console cada falha, inclusive as que os testes
// provocam de propósito. Silenciado para o resultado ficar legível; para ver,
// rode com TESTE_LOGS=1.
if (!process.env.TESTE_LOGS) {
  for (const nivel of ['log', 'debug', 'info', 'warn', 'error'] as const) console[nivel] = () => {}
}
