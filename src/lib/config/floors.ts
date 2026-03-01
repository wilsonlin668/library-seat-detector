export interface FloorDefinition {
  id: string;
  name: string;
  imageSrc: string;
}

export const floors: FloorDefinition[] = [
  {
    id: 'floor-1',
    name: '1/F Study Area',
    imageSrc: '/library-map-floor-1.png',
  },
  {
    id: 'floor-2',
    name: '2/F Main Library',
    imageSrc: '/library-map-floor-2.png',
  },
];

