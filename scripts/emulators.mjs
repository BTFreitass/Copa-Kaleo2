import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const dir = './.emulator-data';
const args = ['emulators:start', '--project', 'demo-copakaleo', `--export-on-exit=${dir}`];
if (existsSync(`${dir}/firebase-export-metadata.json`)) args.push(`--import=${dir}`);
console.log(args.includes(`--import=${dir}`) ? '💾 Carregando o banco local salvo em .emulator-data' : '🆕 Banco local vazio: rode "npm run seed" depois que subir');

const child = spawn('firebase', args, { stdio: 'inherit', shell: true });
const stop = () => child.kill('SIGINT');
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code ?? 0));
