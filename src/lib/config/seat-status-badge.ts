import type { SeatStatus } from '@/lib/config/seat-status';

export type SeatStatusBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export interface SeatStatusBadgeConfig {
  label: string;
  variant: SeatStatusBadgeVariant;
  className?: string;
}

export function getSeatStatusBadgeConfig(seatStatus: SeatStatus): SeatStatusBadgeConfig {
  switch (seatStatus) {
    case 'available':
      return {
        label: 'Available',
        variant: 'outline',
        className: 'bg-green-500/10 text-green-600 border-green-500/40',
      };
    case 'reserved':
      return {
        label: 'Reserved',
        variant: 'outline',
        className: 'bg-orange-500/10 text-orange-600 border-orange-500/40',
      };
    case 'occupied':
      return {
        label: 'Occupied',
        variant: 'outline',
        className: 'bg-gray-500/10 text-gray-700 border-gray-500/40',
      };
    case 'session_expired':
      return {
        label: 'Session expired',
        variant: 'destructive',
      };
  }
}

