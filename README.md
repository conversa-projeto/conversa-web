# Conversa Web

Cliente web do Conversa, construido com Vue 3 + TypeScript + Tailwind CSS.

## Pre-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- Repositorio backend [conversa](../conversa) clonado ao lado deste projeto

## Arquitetura do ambiente

O ambiente de desenvolvimento usa varios servicos que trabalham juntos:

```
Navegador
    |
    | https://<seu-ip>:4430
    v
+--------+
|  Vite  |  (dev server com SSL - porta 4430)
+--------+
    |
    +---> /            -> Pagina, com HMR
    +---> /api/        -> Backend Delphi (porta 8080)
    +---> /ws/         -> WebSocket (porta 9090)
    +---> /storage/    -> MinIO S3 (porta 9000)
    +---> /webrtc/     -> MediaMTX (porta 8889)
```

O Vite atua como ponto de entrada unico, encaminhando cada tipo de requisicao para o servico correto. Isso permite que o frontend acesse tudo pelo mesmo endereco e porta, sem problemas de CORS. Os repasses ficam em `vite.config.ts`.

Em producao esse papel e do nginx, que roda no `docker-compose.yml` do backend com as mesmas rotas.

## Configuracao inicial (primeira vez)

Execute os passos abaixo **uma unica vez**:

### Servicos Docker

Banco, armazenamento e chamadas rodam no Docker, definidos no `docker-compose.yml` na raiz do backend. Com o Docker Desktop aberto:

```
cd conversa
docker compose up -d
```

- Sobe o PostgreSQL, o MinIO, o coturn e o MediaMTX
- O bucket `chat` do MinIO e criado pelo backend quando ele inicia, se ainda nao existir
- Os dados ficam nos volumes `pgdata` e `minio`, e sobrevivem a `docker compose down`
- Senhas padrao: PostgreSQL `root`, MinIO `admin` / `admin123`. Para trocar, crie um arquivo `.env` ao lado do `docker-compose.yml`
- Console do MinIO em `http://localhost:9001`

### setup-cert.bat

Prepara o certificado SSL local para desenvolvimento (necessario para HTTPS e WebRTC). Rode uma unica vez por maquina.

```
conversa\bin\setup-cert.bat
```

- Baixa o [mkcert](https://github.com/FiloSottile/mkcert) se nao estiver instalado
- Instala a CA raiz no sistema para que o navegador confie no certificado
- Pede o IP da sua maquina e gera um primeiro certificado em `conversa\bin\cert\`

Depois disso o certificado se mantem sozinho. A cada `npm run dev`, o Vite confere se ele existe, se esta perto de vencer e se cobre todos os IPs atuais da maquina. Se algo faltar, gera um novo com o mkcert antes de subir. Assim uma troca de IP pelo DHCP nao exige nenhum passo manual.

> Apos esses passos, o ambiente esta pronto. Os passos abaixo sao os que voce executa **toda vez** que for desenvolver.

---

## 1. Abrir o Docker Desktop

Certifique-se de que o **Docker Desktop** esta aberto e rodando. O `_start.bat` do proximo passo sobe os containers, que sao:

| Container  | Imagem                       | Porta               | Funcao                                |
|------------|------------------------------|---------------------|---------------------------------------|
| `postgres` | `postgres:15-alpine`         | `5432`              | Banco de dados PostgreSQL             |
| `minio`    | `quay.io/minio/minio`        | `9000`, `9001`      | Armazenamento de arquivos             |
| `coturn`   | `coturn/coturn`              | `3478` TCP          | Retransmissor TURN das chamadas       |
| `mediamtx` | `bluenviron/mediamtx:1.16.2` | `8889`              | Servidor WebRTC das chamadas          |

Todas as portas escutam so em `127.0.0.1`, exceto a `3478` do TURN, que precisa ser alcancada pelos navegadores.

## 2. Iniciar o servidor backend

O backend e iniciado por um unico script:

```
conversa\bin\_start.bat
```

Basta dar **duplo-clique** neste arquivo. Ele executa `docker compose up -d` e abre o **conversa.rest.exe** numa aba do Windows Terminal, com a API REST na porta 8080 e o WebSocket na porta 9090.

Aguarde alguns segundos ate que todos os servicos estejam prontos. O terminal do `conversa.rest.exe` mostrara as rotas registradas quando estiver pronto.

## 3. Iniciar o frontend (Vite dev server)

Abra a pasta `conversa-web` no VS Code e execute no terminal integrado:

```bash
# Instalar dependencias (apenas na primeira vez ou apos alterar package.json)
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

O Vite sobe em HTTPS na porta **4430**, com o certificado de `conversa\bin\cert\`, gerado ou renovado automaticamente quando necessario. Se a CA do mkcert nunca foi instalada nesta maquina, ele para com uma mensagem pedindo para rodar o `setup-cert.bat`.

## 4. Acessar a aplicacao

Abra o navegador e acesse:

```
https://<seu-ip>:4430
```

Por exemplo: `https://192.168.0.5:4430`

> Em outras máquinas navegador mostrará um aviso de certificado SSL auto-assinado. Clique em **Avancado** e **Prosseguir** para continuar.

**Por que usar o IP e nao localhost?** As chamadas WebRTC exigem HTTPS com um certificado, e o certificado e emitido para os IPs da maquina. Se o IP mudar, basta reiniciar o `npm run dev`. Alem disso, usar o IP permite testar de outros dispositivos na mesma rede (celular, outro computador).

## Comandos disponiveis

| Comando            | Descricao                              |
|--------------------|----------------------------------------|
| `npm run dev`      | Inicia o Vite dev server com HMR       |
| `npm run build`    | Type-check + build de producao         |

## Resumo da ordem de inicializacao

**Primeira vez (setup):**

1. Executar `docker compose up -d` na pasta `conversa` (banco, armazenamento e chamadas)
2. Executar `setup-cert.bat` (gera certificado SSL)
3. Rodar `npm install` no projeto web

**Toda vez que for desenvolver:**

1. Abrir o **Docker Desktop**
2. Executar **`_start.bat`** do backend (containers Docker + API)
3. Rodar **`npm run dev`** no projeto web
4. Acessar **`https://<seu-ip>:4430`** no navegador

## Deploy (atualizar o frontend em producao)

Para publicar uma nova versao do frontend:

```bash
npm run build
```

Isso gera os arquivos otimizados na pasta `dist/`. Em seguida, copie todo o conteudo de `dist/` para a pasta `web/` do servidor backend:

```
conversa-web\dist\*  -->  conversa\bin\web\
```

Em producao quem entrega essa pasta e o nginx do compose, iniciado com `_start.bat producao`. Nao e preciso reiniciar nada apos copiar os arquivos.
