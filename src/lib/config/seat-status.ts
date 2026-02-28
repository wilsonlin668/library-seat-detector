import type { TemperatureReading } from '@/lib/types/temperature';

export type SeatStatus = 'available' | 'reserved' | 'occupied' | 'session_expired';

const SESSION_EXPIRED_AFTER_MS = 5_000;

function baseSeatStatusFromSensors(reading: TemperatureReading): Exclude<SeatStatus, 'session_expired'> {
  const bodyDetected = reading.status === 'body_detected';
  const fsrValue = reading.fsr ?? 0;
  const hasPressure = fsrValue > 0;

  if (bodyDetected && hasPressure) return 'occupied';
  if (!bodyDetected && hasPressure) return 'reserved';
  return 'available';
}

export function computeSeatStatus(reading: TemperatureReading, history: TemperatureReading[]): SeatStatus {
  const baseStatus = baseSeatStatusFromSensors(reading);

  if (baseStatus === 'available') {
    const cutoff = reading.timestamp - SESSION_EXPIRED_AFTER_MS;
    const hadReservedRecently = history.some((entry) => {
      if (entry.timestamp < cutoff || entry.timestamp >= reading.timestamp) {
        return false;
      }
      return baseSeatStatusFromSensors(entry) === 'reserved';
    });

    if (hadReservedRecently) {
      return 'session_expired';
    }
  }

  return baseStatus;
}

