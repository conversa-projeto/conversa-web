# Conversa Web

Cliente web do Conversa, construido com Vue 3 + TypeScript + Tailwind CSS.

A API, o banco e o restante do ambiente ficam no repositorio [conversa](../conversa), que precisa estar clonado ao lado deste.

## Como rodar

O passo a passo completo, da primeira vez e do dia a dia, esta no [SETUP.md](../conversa/SETUP.md). Resumo do dia a dia:

1. Duplo-clique em `conversa\bin\desenvolvimento.bat` (so quando os containers estiverem parados; ele roda em segundo plano)
2. Abrir a pasta `conversa` no VS Code com **Reopen in Container**. O Vite sobe sozinho numa aba de terminal
3. Acessar `https://SEU_IP`

O Bun nao precisa estar instalado na maquina: ele roda dentro do Dev Container. Na maquina basta o Docker Desktop e o VS Code com a extensao Dev Containers.

## Como o Vite se conecta ao resto

O navegador fala com o nginx do backend, o mesmo em desenvolvimento e producao. Em desenvolvimento ele termina o HTTPS na porta 443 e repassa a pagina para o Vite, que roda so dentro do Docker, na porta 5173.

```
https://SEU_IP  (nginx)
    ├── /           → pagina: Vite em desenvolvimento, bin/web em producao
    ├── /api/       → API (container api)
    ├── /ws/        → WebSocket da API (container api)
    ├── /storage/   → anexos (container minio)
    └── /webrtc/    → chamadas (container mediamtx)
```

As regras ficam em `conversa/bin/nginx`. Se o Vite nao estiver rodando, a pagina mostra um aviso pedindo para abrir a pasta `conversa` no VS Code.

O certificado HTTPS vem de `conversa\bin\cert`, gerado pelo `setup-cert.bat`. Se o IP da maquina mudar, rode o `setup-cert.bat` de novo e depois `docker restart nginx`.

## Comandos

Rode no terminal do VS Code, dentro de `/git/conversa-web`.

| Comando | Descricao |
|---------|-----------|
| `bun run dev` | Inicia o Vite com recarga automatica. O Dev Container ja roda sozinho ao conectar; use so se tiver parado |
| `bun run build` | Confere os tipos e gera o build de producao em `dist/` |
| `bun run typecheck` | So confere os tipos (pagina, `vite.config.ts` e `scripts/`) |
| `bun install` | Instala dependencias, depois de alterar o `package.json` |

A checagem de tipos usa `scripts/vue-tsc.ts`: o `vue-tsc` direto no Bun nao enxerga os arquivos `.vue`, e o script aplica a mesma adaptacao dele de um jeito que funciona no Bun.

## Atualizar a producao

No terminal do VS Code, gere o build e copie para a pasta que o nginx de producao entrega:

```bash
cd /git/conversa-web && bun run build && rm -rf /git/conversa/bin/web/* && cp -r dist/* /git/conversa/bin/web/
```

Nao e preciso reiniciar nada depois de copiar.
