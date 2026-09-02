import { PrismaClient } from '@prisma/client'

const runtimeDatabaseUrl = (() => {
  const rawUrl = process.env.DATABASE_URL
  if (!rawUrl) return rawUrl

  try {
    const url = new URL(rawUrl)
    const isPooler = url.port === '6543' || url.hostname.includes('pooler')

    if (isPooler) {
      url.searchParams.set('pgbouncer', 'true')
      url.searchParams.set('statement_cache_size', '0')
      url.searchParams.set('connection_limit', '1')
    }

    return url.toString()
  } catch {
    return rawUrl
  }
})()

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: runtimeDatabaseUrl ? { db: { url: runtimeDatabaseUrl } } : undefined,
  })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
