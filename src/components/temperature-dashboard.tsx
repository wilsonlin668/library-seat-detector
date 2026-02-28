'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { IconTemperature, IconLoader, IconAlertCircle, IconHandFinger } from '@tabler/icons-react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import type { TemperatureReading } from '@/lib/types/temperature';
import type { SeatStatus } from '@/lib/config/seat-status';
import { computeSeatStatus } from '@/lib/config/seat-status';
import { getSeatStatusBadgeConfig } from '@/lib/config/seat-status-badge';

const chartConfig = {
  temp: {
    label: 'Temperature (°C)',
    color: 'var(--primary)',
  },
  timestamp: {
    label: 'Time',
  },
} satisfies ChartConfig;

async function fetchTemperature(): Promise<{
  latest: TemperatureReading | null;
  history: TemperatureReading[];
}> {
  const res = await fetch('/api/temperature', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getStatusBadgeVariant(
  status: TemperatureReading['status']
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'body_detected':
      return 'default';
    case 'ambient':
      return 'secondary';
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function TemperatureDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['temperature'],
    queryFn: fetchTemperature,
    refetchInterval: 1_000,
    staleTime: 1_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const latestSeatStatus = React.useMemo<SeatStatus | null>(() => {
    if (!data?.latest || !data.history) return null;
    return computeSeatStatus(data.latest, data.history);
  }, [data?.latest, data?.history]);

  const chartData = React.useMemo(() => {
    if (!data?.history?.length) return [];
    return data.history.map((r) => ({
      temp: r.temp,
      time: formatTime(r.timestamp),
      timestamp: r.timestamp,
    }));
  }, [data?.history]);

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-destructive">
          <IconAlertCircle className="size-5" />
          <span>Failed to load temperature data</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardDescription>Current reading from seat sensor</CardDescription>
          <CardTitle className="flex items-center gap-2">
            {isLoading ? (
              <>
                <IconLoader className="size-6 animate-spin" />
                Loading...
              </>
            ) : data?.latest ? (
              <>
                <IconTemperature className="size-6" />
                {data.latest.temp.toFixed(1)} °C
                <Badge variant={getStatusBadgeVariant(data.latest.status)}>
                  {data.latest.status.replace('_', ' ')}
                </Badge>
                {data.latest.fsr != null && (
                  <>
                    <IconHandFinger className="size-6 ml-2" />
                    <span className="text-muted-foreground">FSR: {data.latest.fsr}</span>
                  </>
                )}
                {latestSeatStatus && (
                  <Badge
                    {...getSeatStatusBadgeConfig(latestSeatStatus)}
                    className={`ml-2 ${getSeatStatusBadgeConfig(latestSeatStatus).className ?? ''}`}
                  >
                    {getSeatStatusBadgeConfig(latestSeatStatus).label}
                  </Badge>
                )}
              </>
            ) : (
              <>No data yet — connect Arduino and run serial bridge</>
            )}
          </CardTitle>
        </CardHeader>
        {data?.latest && (
          <CardContent className="text-sm text-muted-foreground">
            Last updated: {formatTime(data.latest.timestamp)}
          </CardContent>
        )}
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Temperature history</CardTitle>
            <CardDescription>Recent readings over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="fillTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-temp)"
                      stopOpacity={1}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-temp)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [`${value} °C`, 'Temperature']}
                    />
                  }
                />
                <Area
                  dataKey="temp"
                  type="natural"
                  fill="url(#fillTemp)"
                  stroke="var(--color-temp)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
