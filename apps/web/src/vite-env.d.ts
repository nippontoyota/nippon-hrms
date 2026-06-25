/// <reference types="vite/client" />

// CSS module type declarations
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

// Supabase env vars — set in .env.local
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
