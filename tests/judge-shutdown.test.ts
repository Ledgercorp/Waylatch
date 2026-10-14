import { expect, test } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, connect, type Socket } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

test('repeated shutdown signals drain an active request and remove only the isolated judge data', async () => {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = (reservation.address() as { port: number }).port;
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  const directory = mkdtempSync(join(tmpdir(), 'waylatch-shutdown-test-'));
  writeFileSync(join(directory, 'unrelated.txt'), 'keep');
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', 'scripts/judge-demo.ts', '--evidence-only'],
    {
      env: { ...process.env, TMPDIR: directory, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const exited = once(child, 'exit');
  let socket: Socket | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error('Judge listener did not start')), 10000);
      child.stdout.on('data', (chunk) => {
        output += String(chunk);
        if (output.includes('Waylatch judge demo:')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('exit', () => {
        clearTimeout(timer);
        reject(new Error('Judge exited before startup'));
      });
    });
    expect(
      readdirSync(directory).filter((name) => name.startsWith('waylatch-judge-')),
    ).toHaveLength(1);
    socket = connect(port, '127.0.0.1');
    await once(socket, 'connect');
    // A partially delivered JSON body keeps an HTTP request active during server.close().
    socket.write(
      `POST /api/demo/session HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nOrigin: http://127.0.0.1:${port}\r\nContent-Type: application/json\r\nContent-Length: 1000\r\nConnection: close\r\n\r\n{`,
    );
    await delay(100);
    child.kill('SIGTERM');
    await delay(100);
    expect(child.exitCode).toBeNull();
    child.kill('SIGTERM');
    await delay(100);
    socket.destroy();
    const [code, signal] = await exited;
    expect({ code, signal }).toEqual({ code: 0, signal: null });
    expect(readdirSync(directory).filter((name) => name.startsWith('waylatch-judge-'))).toEqual([]);
    expect(readFileSync(join(directory, 'unrelated.txt'), 'utf8')).toBe('keep');
  } finally {
    socket?.destroy();
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await exited;
    rmSync(directory, { recursive: true, force: true });
  }
}, 15000);
