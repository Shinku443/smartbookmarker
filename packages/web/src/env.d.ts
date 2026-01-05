/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG_SYNC?: string;
  // add more vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}