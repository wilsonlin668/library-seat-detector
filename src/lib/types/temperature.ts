export type TemperatureStatus = 'body_detected' | 'ambient' | 'error';

export interface TemperatureReading {
  temp: number;
  status: TemperatureStatus;
  timestamp: number;
}
