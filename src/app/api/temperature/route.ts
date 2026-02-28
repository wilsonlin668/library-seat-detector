import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

import type { TemperatureReading } from '@/lib/types/temperature';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_HISTORY = 500;

function getDataPath(): string {
  return join(process.cwd(), 'data', 'temperature.json');
}

interface StoredData {
  latest: TemperatureReading | null;
  history: TemperatureReading[];
}

let memory: StoredData = { latest: null, history: [] };
let memoryLoaded = false;

async function loadFromFile(): Promise<StoredData> {
  try {
    const raw = await readFile(getDataPath(), 'utf-8');
    const parsed = JSON.parse(raw) as StoredData;
    return {
      latest: parsed.latest ?? null,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { latest: null, history: [] };
  }
}

async function saveToFile(data: StoredData): Promise<void> {
  try {
    const dir = join(process.cwd(), 'data');
    await mkdir(dir, { recursive: true });
    await writeFile(getDataPath(), JSON.stringify(data), 'utf-8');
  } catch {
    // persist best-effort; in-memory still updated
  }
}

export async function GET() {
  if (!memoryLoaded) {
    memory = await loadFromFile();
    memoryLoaded = true;
  }
  return NextResponse.json({
    latest: memory.latest,
    history: memory.history.slice(-100),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const temp = typeof body.temp === 'number' ? body.temp : parseFloat(body.temp);
    const status = body.status ?? 'error';

    if (typeof temp !== 'number' || isNaN(temp)) {
      return NextResponse.json(
        { error: 'Invalid temp value' },
        { status: 400 }
      );
    }

    const reading: TemperatureReading = {
      temp,
      status: status as TemperatureReading['status'],
      timestamp: Date.now(),
    };

    const newHistory = [...memory.history, reading];
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    memory = {
      latest: reading,
      history: newHistory,
    };
    memoryLoaded = true;

    await saveToFile(memory);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
