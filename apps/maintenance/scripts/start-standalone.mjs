import { cpSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import nextEnv from '@next/env'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(scriptsDir, '..')
const workspaceDir = path.resolve(appDir, '..', '..')
const standaloneDir = path.join(appDir, '.next', 'standalone')

nextEnv.loadEnvConfig(appDir)
if (!process.env.DATABASE_URL && existsSync(path.join(workspaceDir, '.env.local'))) nextEnv.loadEnvConfig(workspaceDir)

if (!existsSync(path.join(standaloneDir, 'server.js'))) {
  throw new Error('Standalone build is missing. Run npm run build before npm run start.')
}

cpSync(path.join(appDir, 'public'), path.join(standaloneDir, 'public'), { recursive: true })
mkdirSync(path.join(standaloneDir, '.next'), { recursive: true })
cpSync(path.join(appDir, '.next', 'static'), path.join(standaloneDir, '.next', 'static'), { recursive: true })

const server = spawn(process.execPath, [path.join(standaloneDir, 'server.js')], {
  cwd: standaloneDir,
  env: process.env,
  stdio: 'inherit',
})

server.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
