/**
 * Serial bridge: reads JSON from Arduino Serial and POSTs to /api/temperature
 * Run: node scripts/serial-bridge.js  (or: npm run serial-bridge)
 * Use COM9: PowerShell: $env:SERIAL_PORT='COM9'; node scripts/serial-bridge.js
 * Requires: npm install serialport @serialport/parser-readline
 *
 * Start Next.js first (npm run dev), then run this script.
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Load .env from project root so SERIAL_PORT=COM9 in .env is used
try {
  const envPath = path.join(process.cwd(), '.env');
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
} catch {
  // .env optional
}

const API_URL = 'http://localhost:3000/api/temperature';
const BAUDRATE = 9600;
const SEND_INTERVAL_MS = 1 * 1000;
const DEBUG = process.env.DEBUG === '1';
const PORT_OVERRIDE = process.env.SERIAL_PORT || process.env.COM_PORT;

async function findArduinoPort() {
  const ports = await SerialPort.list();
  if (DEBUG) {
    console.log('Available ports:', ports.map((p) => ({ path: p.path, manufacturer: p.manufacturer, vendorId: p.vendorId })));
  }
  const arduino = ports.find(
    (p) =>
      p.vendorId?.toLowerCase().includes('2341') ||
      p.vendorId?.toLowerCase().includes('2a03') ||
      p.manufacturer?.toLowerCase().includes('arduino') ||
      p.friendlyName?.toLowerCase().includes('arduino')
  );
  return arduino?.path ?? ports[0]?.path;
}

function postToApi(data) {
  const body = JSON.stringify(data);
  const url = new URL(API_URL);
  const port = url.port || '3000';
  const options = {
    hostname: url.hostname,
    port: Number(port),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  const req = http.request(options, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const responseBody = Buffer.concat(chunks).toString('utf-8');
      if (res.statusCode !== 200) {
        console.error('API error:', res.statusCode, responseBody);
      } else if (DEBUG) {
        console.log('API response:', res.statusCode, responseBody);
      }
    });
  });
  req.on('error', (err) => {
    console.error('Request error (is Next.js running on port 3000?):', err.message);
  });
  req.write(body);
  req.end();
}

function checkApiReachable() {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    const port = url.port || '3000';
    const req = http.request(
      {
        hostname: url.hostname,
        port: Number(port),
        path: url.pathname,
        method: 'GET',
      },
      (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve());
      }
    );
    req.on('error', (err) => {
      console.error('Cannot reach API at', API_URL);
      console.error('Start Next.js first (e.g. npm run dev) then run this script.');
      reject(err);
    });
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('API request timeout'));
    });
    req.end();
  });
}

const OPEN_RETRIES = 5;
const OPEN_RETRY_MS = 2500;

function openPort(portPath, baudRate) {
  return new Promise((resolve, reject) => {
    const p = new SerialPort({ path: portPath, baudRate }, (err) => {
      if (err) reject(err);
      else resolve(p);
    });
  });
}

async function openPortWithRetry(portPath, baudRate) {
  let lastErr;
  for (let attempt = 1; attempt <= OPEN_RETRIES; attempt++) {
    try {
      return await openPort(portPath, baudRate);
    } catch (err) {
      lastErr = err;
      const isAccessDenied = /access denied|EBUSY|EACCES/i.test(err.message || '');
      if (isAccessDenied && attempt < OPEN_RETRIES) {
        console.error(`Open failed (attempt ${attempt}/${OPEN_RETRIES}):`, err.message);
        console.log(`Waiting ${OPEN_RETRY_MS / 1000}s before retry... Close Arduino Serial Monitor or other app using ${portPath}.`);
        await new Promise((r) => setTimeout(r, OPEN_RETRY_MS));
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

async function main() {
  try {
    const portPath = PORT_OVERRIDE || (await findArduinoPort());
    if (!portPath) {
      console.error('No serial port found. Connect Arduino and try again.');
      process.exit(1);
    }

    console.log('Connecting to', portPath);
    await checkApiReachable();

    const port = await openPortWithRetry(portPath, BAUDRATE);

    let latest = null;
    let intervalId = null;
    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
    parser.on('data', (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (DEBUG) console.log('Raw line:', JSON.stringify(trimmed));
      let data;
      try {
        data = JSON.parse(trimmed);
      } catch (err) {
        console.warn('Skipped (invalid JSON):', trimmed.slice(0, 60) + (trimmed.length > 60 ? '...' : ''));
        return;
      }
      const temp = typeof data.temp === 'number' ? data.temp : parseFloat(data.temp);
      const status = data.status ?? '';
      const fsr =
        typeof data.fsr === 'number'
          ? data.fsr
          : data.fsr != null
            ? parseInt(String(data.fsr), 10)
            : undefined;
      if (typeof temp !== 'number' || isNaN(temp)) {
        console.warn('Skipped (invalid temp):', trimmed.slice(0, 60) + (trimmed.length > 60 ? '...' : ''));
        return;
      }
      if (!status || typeof status !== 'string') {
        console.warn('Skipped (missing/invalid status):', trimmed.slice(0, 60) + (trimmed.length > 60 ? '...' : ''));
        return;
      }
      latest =
        typeof fsr === 'number' && !isNaN(fsr)
          ? { temp, status, fsr }
          : { temp, status };
      sendLatest();
    });

    const sendLatest = () => {
      if (!latest) return;
      postToApi(latest);
      const fsrStr = latest.fsr != null ? ` FSR: ${latest.fsr}` : '';
      console.log('Sent:', latest.temp.toFixed(1), '°C', latest.status + fsrStr);
    };
    intervalId = setInterval(sendLatest, SEND_INTERVAL_MS);

    console.log('Waiting for first reading from Arduino...');

    port.on('error', (err) => {
      if (intervalId) clearInterval(intervalId);
      console.error('Serial error:', err.message);
      process.exit(1);
    });

    console.log('Bridge running. POSTing to', API_URL);
    console.log('(If nothing appears below: close Serial Monitor, confirm Arduino is on', portPath + ', 9600 baud)');
  } catch (err) {
    console.error(err.message);
    if (/access denied|Opening COM|EBUSY|EACCES/i.test(err.message || '')) {
      console.error('');
      console.error('Port is in use or blocked. Try:');
      console.error('  1. Close Arduino IDE (and Serial Monitor), unplug Arduino, wait 5s, plug back in');
      console.error('  2. Use a different COM port (see list below) — set SERIAL_PORT in .env');
      console.error('  3. Reboot PC if the port stays locked');
      (async () => {
        try {
          const ports = await SerialPort.list();
          if (ports.length > 0) {
            console.error('');
            console.error('Available ports:');
            ports.forEach((p) => {
              const mark = p.path === portPath ? ' (failed to open)' : '';
              console.error('  ', p.path, p.manufacturer || '', p.vendorId || '', mark);
            });
            const other = ports.find((p) => p.path !== portPath);
            if (other) {
              console.error('');
              console.error('Try in .env: SERIAL_PORT=' + other.path);
            }
          }
        } catch {
          // ignore
        }
        process.exit(1);
      })();
      return;
    }
    process.exit(1);
  }
}

main();
