/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_STUN_URL?: string
  readonly VITE_MEDIAMTX_PORT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
