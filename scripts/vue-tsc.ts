// vue-tsc rodando no Bun: checagem de tipos com os arquivos .vue.
//
// O vue-tsc ensina o compilador do TypeScript a ler .vue reescrevendo o codigo
// dele na hora de carregar, pela troca do fs.readFileSync do Node. O carregador
// de modulos do Bun nao passa por essa funcao: sem isso os .vue ficam de fora
// ("Cannot find module './App.vue'"). Aqui a mesma reescrita (transformTscContent,
// do Volar) e aplicada ao compilador, que e executado direto, com o plugin do Vue
// montado como no vue-tsc. Aceita os mesmos argumentos do tsc (-b, --noEmit...).
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import type { LanguagePlugin } from '@volar/language-core'
import type * as runTscModulo from '@volar/typescript/lib/quickstart/runTsc'
import { createParsedCommandLine, createParsedCommandLineByJson, createVueLanguagePlugin } from '@vue/language-core'

const require = createRequire(import.meta.url)
const caminhoTsc = require.resolve('typescript/lib/_tsc.js')
const caminhoRunTsc = require.resolve('@volar/typescript/lib/quickstart/runTsc')
const caminhoProxy = require.resolve('@volar/typescript/lib/node/proxyCreateProgram')

// O compilador reescrito busca os plugins de linguagem neste modulo
const runTsc: typeof runTscModulo = require(caminhoRunTsc)
runTsc.getLanguagePlugins = (ts, opcoes): LanguagePlugin<string>[] => {
  const { configFilePath } = opcoes.options
  const { vueOptions } = typeof configFilePath === 'string'
    ? createParsedCommandLine(ts, ts.sys, configFilePath.replaceAll('\\', '/'))
    : createParsedCommandLineByJson(ts, ts.sys, (opcoes.host ?? ts.sys).getCurrentDirectory(), {})
  return [createVueLanguagePlugin(ts, opcoes.options, vueOptions, (id) => id)]
}

const codigo = runTsc.transformTscContent(readFileSync(caminhoTsc, 'utf8'), caminhoProxy, ['.vue'], [], caminhoRunTsc)
const modulo = { exports: {} }
// Executa como CommonJS, com require, __filename e __dirname do proprio compilador
const compilador = new Function('exports', 'require', 'module', '__filename', '__dirname', codigo)
compilador(modulo.exports, createRequire(caminhoTsc), modulo, caminhoTsc, dirname(caminhoTsc))
