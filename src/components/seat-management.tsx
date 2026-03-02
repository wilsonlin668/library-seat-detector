'use client';

import React from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react';
import type { SeatStatus } from '@/lib/config/seat-status';
import { computeSeatStatus } from '@/lib/config/seat-status';
import { getSeatStatusBadgeConfig } from '@/lib/config/seat-status-badge';
import type { TemperatureReading } from '@/lib/types/temperature';
import { floors, type FloorDefinition } from '@/lib/config/floors';
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChevronDownIcon, PlusIcon, Trash2Icon } from 'lucide-react';

type Seat = {
  id: string;
  xPercent: number;
  yPercent: number;
  status?: SeatStatus;
};

type DragPosition = {
  x: number;
  y: number;
};

type SeatMapMode = 'view' | 'edit';

type InternalDragEventShape = {
  operation: {
    position: DragPosition;
    source: {
      id: string | number;
    };
  };
};

interface DraggableSeatProps {
  seat: Seat;
  isSelected: boolean;
  isEditable: boolean;
  onSelect: () => void;
}

function DraggableSeat({
  seat,
  isSelected,
  isEditable,
  onSelect,
}: DraggableSeatProps) {
  const { ref, isDragging } = useDraggable({
    id: seat.id,
    disabled: !isEditable,
  });

  const baseClasses =
    'absolute flex items-center justify-center rounded-full border-2 shadow-md ring-1 ring-black/10 transition-colors';
  const statusConfig = seat.status
    ? getSeatStatusBadgeConfig(seat.status)
    : undefined;

  const colorClasses =
    seat.status && statusConfig?.className
      ? statusConfig.className
      : seat.status === 'occupied'
        ? 'bg-gray-500 text-white'
        : seat.status === 'reserved'
          ? 'bg-orange-500/80 text-white'
          : seat.status === 'session_expired'
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-white/90';

  const borderColorByStatus =
    seat.status === 'available'
      ? 'border-green-500'
      : seat.status === 'reserved'
        ? 'border-orange-500'
        : seat.status === 'occupied'
          ? 'border-gray-500'
          : seat.status === 'session_expired'
            ? 'border-destructive'
            : 'border-slate-400';

  const stateClasses = [
    colorClasses,
    borderColorByStatus,
    isSelected
      ? 'ring-3 ring-primary ring-offset-3 ring-offset-background'
      : '',
    isDragging ? 'ring-3 ring-primary/50 scale-110 shadow-lg' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onSelect();
        }
      }}
      className={`${baseClasses} ${stateClasses}`}
      style={{
        width: 32,
        height: 32,
        left: `${seat.xPercent ?? 0}%`,
        top: `${seat.yPercent ?? 0}%`,
        transform: 'translate(-50%, -50%)',
      }}
      aria-label="Seat"
    />
  );
}

function MapDropZone({
  mapRef,
  className,
  onClick,
  children,
}: {
  mapRef: React.RefObject<HTMLDivElement | null>;
  className: string;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}) {
  const { ref: droppableRef } = useDroppable({ id: 'seat-map' });
  const setRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      (mapRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      droppableRef(el);
    },
    [mapRef, droppableRef]
  );
  return (
    <div ref={setRef} className={className} onClick={onClick}>
      {children}
    </div>
  );
}

async function fetchTemperature(): Promise<{
  latest: TemperatureReading | null;
  history: TemperatureReading[];
}> {
  const res = await fetch('/api/temperature', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch temperature');
  return res.json();
}

function storageKeyForFloor(floorId: string): string {
  return `seat-map:v1:${floorId}`;
}

function loadSeatsForFloor(floorId: string): Seat[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(storageKeyForFloor(floorId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Seat[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((seat) => ({
      id: seat.id,
      xPercent: typeof seat.xPercent === 'number' ? seat.xPercent : 0,
      yPercent: typeof seat.yPercent === 'number' ? seat.yPercent : 0,
      status: seat.status,
    }));
  } catch {
    return [];
  }
}

function saveSeatsForFloor(floorId: string, seats: Seat[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    storageKeyForFloor(floorId),
    JSON.stringify(seats)
  );
}

export function SeatManagement() {
  const [floorsList, setFloorsList] = React.useState<FloorDefinition[]>(() => [
    ...floors,
  ]);
  const initialFloor: FloorDefinition = floorsList[0];
  const [activeFloorId, setActiveFloorId] = React.useState<string>(
    initialFloor.id
  );
  const [openCombobox, setOpenCombobox] = React.useState<boolean>(false);
  const [openAddFloorDialog, setOpenAddFloorDialog] =
    React.useState<boolean>(false);
  const [newFloorName, setNewFloorName] = React.useState<string>('');
  const [newFloorImageSrc, setNewFloorImageSrc] = React.useState<string>(
    '/library-map-floor-1.png'
  );
  const [seats, setSeats] = React.useState<Seat[]>(() =>
    loadSeatsForFloor(initialFloor.id)
  );
  const [selectedSeatId, setSelectedSeatId] = React.useState<string | null>(
    null
  );
  const [mode, setMode] = React.useState<SeatMapMode>('view');
  const [hasUnsavedChanges, setHasUnsavedChanges] =
    React.useState<boolean>(false);

  const mapRef = React.useRef<HTMLDivElement | null>(null);

  const { data: temperatureData } = useQuery({
    queryKey: ['temperature'],
    queryFn: fetchTemperature,
    refetchInterval: 1_000,
    staleTime: 1_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const channelSeatStatus = React.useMemo<SeatStatus | null>(() => {
    if (!temperatureData?.latest || !temperatureData.history) return null;
    return computeSeatStatus(temperatureData.latest, temperatureData.history);
  }, [temperatureData?.latest, temperatureData?.history]);

  const seatsForDisplay = React.useMemo(() => {
    return seats.map((seat, index) => ({
      ...seat,
      status:
        (index === 0 ? channelSeatStatus ?? 'available' : 'available') as SeatStatus,
    }));
  }, [seats, channelSeatStatus]);

  const activeFloor = React.useMemo(
    () =>
      floorsList.find((floor) => floor.id === activeFloorId) ?? floorsList[0],
    [activeFloorId, floorsList]
  );

  React.useEffect(() => {
    const loadedSeats = loadSeatsForFloor(activeFloorId);
    setSeats(loadedSeats);
    setSelectedSeatId(null);
    setHasUnsavedChanges(false);
  }, [activeFloorId]);

  const updateSeatPositionFromClient = React.useCallback(
    (seatId: string, position: DragPosition) => {
      const container = mapRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const pos = position as {
        x?: number;
        y?: number;
        current?: { x: number; y: number };
        nativeEvent?: { clientX: number; clientY: number };
      };
      let clientX: number | undefined =
        typeof pos.x === 'number' ? pos.x : pos.current?.x;
      let clientY: number | undefined =
        typeof pos.y === 'number' ? pos.y : pos.current?.y;
      if (typeof clientX !== 'number' || typeof clientY !== 'number') {
        clientX = pos.nativeEvent?.clientX;
        clientY = pos.nativeEvent?.clientY;
      }

      if (typeof clientX !== 'number' || typeof clientY !== 'number') return;

      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;

      const clampedX = Math.min(100, Math.max(0, x));
      const clampedY = Math.min(100, Math.max(0, y));

      if (Number.isNaN(clampedX) || Number.isNaN(clampedY)) return;

      setSeats((previousSeats) =>
        previousSeats.map((seat) =>
          seat.id === seatId
            ? { ...seat, xPercent: clampedX, yPercent: clampedY }
            : seat
        )
      );
      setHasUnsavedChanges(true);
    },
    []
  );

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'edit') {
      return;
    }

    const container = mapRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.min(100, Math.max(0, x));
    const clampedY = Math.min(100, Math.max(0, y));

    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `seat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setSeats((previousSeats) => [
      ...previousSeats,
      { id, xPercent: clampedX, yPercent: clampedY },
    ]);
    setSelectedSeatId(id);
    setHasUnsavedChanges(true);
  };

  const handleDeleteSeat = (seatId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setSeats((previousSeats) =>
      previousSeats.filter((seat) => seat.id !== seatId)
    );
    setSelectedSeatId((current) => (current === seatId ? null : current));
    setHasUnsavedChanges(true);
  };

  const handleClearAll = () => {
    if (seats.length === 0) {
      return;
    }
    setSeats([]);
    setSelectedSeatId(null);
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = () => {
    saveSeatsForFloor(activeFloorId, seats);
    setHasUnsavedChanges(false);
    setMode('view');
  };

  const handleCancelEdit = () => {
    setSeats(loadSeatsForFloor(activeFloorId));
    setSelectedSeatId(null);
    setHasUnsavedChanges(false);
    setMode('view');
  };

  const handleDragMove = React.useCallback(
    (event: unknown) => {
      if (mode !== 'edit') return;
      const dragEvent = event as InternalDragEventShape;
      const position = dragEvent?.operation?.position;
      const seatId = dragEvent?.operation?.source?.id;
      if (position == null || seatId == null) return;
      updateSeatPositionFromClient(String(seatId), position as DragPosition);
    },
    [mode, updateSeatPositionFromClient]
  );

  const handleDragEnd = React.useCallback(
    (event: unknown) => {
      if (mode !== 'edit') return;
      const dragEvent = event as InternalDragEventShape;
      const position = dragEvent?.operation?.position;
      const seatId = dragEvent?.operation?.source?.id;
      if (position == null || seatId == null) return;
      updateSeatPositionFromClient(String(seatId), position as DragPosition);
    },
    [mode, updateSeatPositionFromClient]
  );

  const handleAddNewFloor = () => {
    const name = newFloorName.trim() || `Floor ${floorsList.length + 1}`;
    const imageSrc = newFloorImageSrc.trim() || '/library-map-floor-1.png';
    const id = `floor-${Date.now()}`;
    const newFloor: FloorDefinition = { id, name, imageSrc };
    setFloorsList((prev) => [...prev, newFloor]);
    setActiveFloorId(id);
    setNewFloorName('');
    setNewFloorImageSrc('/library-map-floor-1.png');
    setOpenAddFloorDialog(false);
    setOpenCombobox(false);
  };

  const handleComboboxSelect = (value: string) => {
    if (value === 'Add new floor') {
      setOpenCombobox(false);
      setOpenAddFloorDialog(true);
      return;
    }
    const floor = floorsList.find(
      (f) => f.id === value || `${f.id} ${f.name}` === value
    );
    if (floor) {
      setActiveFloorId(floor.id);
    }
    setOpenCombobox(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden">
        <Card className="flex min-h-0 w-3/12 max-w-xs min-w-[220px] flex-col overflow-hidden">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between truncate text-xs font-normal"
                >
                  <span className="min-w-0 truncate">{activeFloor.name}</span>
                  <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search floor..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No floor found.</CommandEmpty>
                    {floorsList.map((floor) => (
                      <CommandItem
                        key={floor.id}
                        value={`${floor.id} ${floor.name}`}
                        onSelect={() => handleComboboxSelect(floor.id)}
                      >
                        <span className="truncate">{floor.name}</span>
                      </CommandItem>
                    ))}
                    <CommandSeparator />
                    <CommandItem
                      value="Add new floor"
                      onSelect={() => handleComboboxSelect('Add new floor')}
                      className="text-primary"
                    >
                      <PlusIcon className="size-4" />
                      Add new floor
                    </CommandItem>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="mt-0 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              <CardHeader className="flex shrink-0 items-center justify-between gap-2 px-2">
                <CardTitle className="py-2.5">All Seats</CardTitle>
                {mode === 'edit' && (
                  <CardAction className="flex shrink-0 gap-1 py-0">
                    <Button
                      variant="link"
                      className="py-0 text-xs"
                      onClick={handleClearAll}
                      disabled={seats.length === 0}
                    >
                      Clear All
                    </Button>
                  </CardAction>
                )}
              </CardHeader>

              <ScrollArea className="min-h-0 flex-1 overflow-auto">
                <ItemGroup className="gap-2 pr-2">
                  {seatsForDisplay.map((seat, index) => {
                    const isSelected = seat.id === selectedSeatId;
                    const statusConfig = seat.status
                      ? getSeatStatusBadgeConfig(seat.status)
                      : null;
                    const seatNumber = `#${String(index + 1).padStart(3, '0')}`;
                    const title = `${seatNumber}`;
                    return (
                      <Item
                        key={seat.id}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedSeatId((current) =>
                            current === seat.id ? null : seat.id
                          )
                        }
                        className={
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : undefined
                        }
                      >
                        <ItemContent className="gap-0">
                          <ItemTitle className="truncate text-sm">
                            {title}
                          </ItemTitle>
                          <ItemDescription className="text-xs">
                            X: {(seat.xPercent ?? 0).toFixed(1)}% · Y:{' '}
                            {(seat.yPercent ?? 0).toFixed(1)}%
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          {mode === 'edit' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8 shrink-0"
                              aria-label={`Delete seat ${title}`}
                              onClick={handleDeleteSeat(seat.id)}
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          ) : statusConfig ? (
                            <Badge
                              variant={statusConfig.variant}
                              className={statusConfig.className}
                            >
                              {statusConfig.label}
                            </Badge>
                          ) : (
                            <Badge variant="outline">—</Badge>
                          )}
                        </ItemActions>
                      </Item>
                    );
                  })}
                </ItemGroup>
                {seats.length === 0 && (
                  <p className="text-muted-foreground py-4 text-center text-xs">
                    No seats. Switch to Edit and click the map to add.
                  </p>
                )}
              </ScrollArea>
            </div>
          </CardContent>

          <CardFooter className="mt-auto flex min-w-0 shrink-0 flex-col gap-2 border-t pt-3">
            {mode === 'view' ? (
              <Button
                className="w-full min-w-0"
                onClick={() => setMode('edit')}
              >
                Edit
              </Button>
            ) : (
              <div className="flex w-full gap-4">
                <Button
                  variant="outline"
                  className="min-w-0 flex-1"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  className="min-w-0 flex-1"
                  onClick={handleSaveChanges}
                  disabled={!hasUnsavedChanges}
                >
                  Save
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>

        <Dialog open={openAddFloorDialog} onOpenChange={setOpenAddFloorDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add new floor</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-floor-name">Name</Label>
                <Input
                  id="new-floor-name"
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  placeholder="e.g. 3/F Reading Room"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-floor-image">Image URL</Label>
                <Input
                  id="new-floor-image"
                  value={newFloorImageSrc}
                  onChange={(e) => setNewFloorImageSrc(e.target.value)}
                  placeholder="/library-map-floor-1.png"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpenAddFloorDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddNewFloor}>Add floor</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="flex min-h-0 w-9/12 flex-1 flex-col overflow-hidden p-0">
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <DragDropProvider
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
            >
              <div className="bg-muted relative min-h-0 flex-1 overflow-hidden rounded-lg border">
                <MapDropZone
                  mapRef={mapRef}
                  className={`absolute inset-0 origin-center ${mode === 'edit' ? 'cursor-crosshair' : ''}`}
                  onClick={handleMapClick}
                >
                  <Image
                    src={activeFloor.imageSrc}
                    alt={activeFloor.name}
                    fill
                    sizes="(min-width: 1024px) 800px, 100vw"
                    className="pointer-events-none object-contain opacity-60 select-none"
                    priority
                  />

                  {seatsForDisplay.map((seat) => (
                    <DraggableSeat
                      key={seat.id}
                      seat={seat}
                      isSelected={seat.id === selectedSeatId}
                      isEditable={mode === 'edit'}
                      onSelect={() =>
                        setSelectedSeatId((current) =>
                          current === seat.id ? null : seat.id
                        )
                      }
                    />
                  ))}
                </MapDropZone>
              </div>
            </DragDropProvider>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
