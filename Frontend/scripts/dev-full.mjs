import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const serverDir = path.resolve(webDir, '..', 'Backend-API')
const isWin = process.platform === 'win32'

const procs = [
  {
    name: 'backend',
    cmd: isWin ? '.venv\\Scripts\\python.exe' : '.venv/bin/python',
    args: ['-m', 'uvicorn', 'app.main:app', '--port', '8000', '--reload'],
    cwd: serverDir,
  },
  {
    name: 'frontend',
    cmd: 'pnpm',
    args: ['dev'],
    cwd: webDir,
  },
]

const children = []

for (const { name, cmd, args, cwd } of procs) {
  const child = isWin
    ? spawn([cmd, ...args].join(' '), { cwd, shell: true, env: process.env })
    : spawn(cmd, args, { cwd, env: process.env })
  children.push(child)
  const tag = `\x1b[36m[${name}]\x1b[0m `
  child.stdout.on('data', data => {
    process.stdout.write(tag + data.toString().replace(/\n(?=.)/g, '\n' + tag))
  })
  child.stderr.on('data', data => {
    process.stderr.write(tag + data.toString().replace(/\n(?=.)/g, '\n' + tag))
  })
  child.on('exit', code => {
    console.log(`${tag}proceso terminado (código ${code})`)
    shutdown()
  })
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill()
  }
}

process.on('SIGINT', () => {
  shutdown()
  process.exit(0)
})
process.on('SIGTERM', () => {
  shutdown()
  process.exit(0)
})
