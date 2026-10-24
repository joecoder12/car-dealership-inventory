import type { Vehicle, VehicleCategory } from '../../types/models';

/**
 * Original side-profile illustrations generated from a handful of proportions
 * per body style, so every listing has artwork without third-party images.
 * Coordinates are in a 320×170 box with the car facing right after mirroring.
 */
interface Profile {
  front: number;
  rear: number;
  nose: number;
  belt: number;
  tail: number;
  aBase: number;
  roofFront: number;
  roofRear: number;
  cBase: number;
  roof: number;
  wheels: [number, number];
  radius: number;
  sill: number;
  openTop?: boolean;
  bed?: boolean;
}

const PROFILES: Record<VehicleCategory, Profile> = {
  SEDAN: {
    front: 22,
    rear: 298,
    nose: 106,
    belt: 92,
    tail: 95,
    aBase: 110,
    roofFront: 148,
    roofRear: 222,
    cBase: 256,
    roof: 60,
    wheels: [78, 242],
    radius: 21,
    sill: 128,
  },
  COUPE: {
    front: 24,
    rear: 296,
    nose: 110,
    belt: 97,
    tail: 98,
    aBase: 116,
    roofFront: 162,
    roofRear: 212,
    cBase: 262,
    roof: 68,
    wheels: [80, 240],
    radius: 21,
    sill: 129,
  },
  CONVERTIBLE: {
    front: 24,
    rear: 296,
    nose: 110,
    belt: 97,
    tail: 98,
    aBase: 128,
    roofFront: 150,
    roofRear: 150,
    cBase: 150,
    roof: 76,
    wheels: [80, 240],
    radius: 21,
    sill: 129,
    openTop: true,
  },
  HATCHBACK: {
    front: 36,
    rear: 284,
    nose: 104,
    belt: 90,
    tail: 90,
    aBase: 108,
    roofFront: 146,
    roofRear: 244,
    cBase: 280,
    roof: 58,
    wheels: [84, 236],
    radius: 21,
    sill: 128,
  },
  WAGON: {
    front: 22,
    rear: 298,
    nose: 106,
    belt: 91,
    tail: 91,
    aBase: 110,
    roofFront: 148,
    roofRear: 272,
    cBase: 292,
    roof: 58,
    wheels: [78, 244],
    radius: 21,
    sill: 128,
  },
  SUV: {
    front: 24,
    rear: 296,
    nose: 96,
    belt: 84,
    tail: 84,
    aBase: 102,
    roofFront: 138,
    roofRear: 268,
    cBase: 290,
    roof: 46,
    wheels: [80, 242],
    radius: 24,
    sill: 122,
  },
  TRUCK: {
    front: 18,
    rear: 302,
    nose: 96,
    belt: 86,
    tail: 86,
    aBase: 100,
    roofFront: 130,
    roofRear: 184,
    cBase: 192,
    roof: 48,
    wheels: [76, 250],
    radius: 24,
    sill: 122,
    bed: true,
  },
  VAN: {
    front: 26,
    rear: 296,
    nose: 98,
    belt: 88,
    tail: 88,
    aBase: 64,
    roofFront: 102,
    roofRear: 286,
    cBase: 296,
    roof: 38,
    wheels: [78, 246],
    radius: 21,
    sill: 127,
  },
};

const PAINTS = [
  '#2b3442',
  '#9aa3b2',
  '#e6e3dc',
  '#22345e',
  '#9c2b2b',
  '#2f4b3c',
  '#b5622f',
  '#c4ad86',
  '#1a1d23',
];

function paintFor(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PAINTS[hash % PAINTS.length]!;
}

function bodyPath(p: Profile): string {
  const [w1, w2] = p.wheels;
  const arch = p.radius + 4;
  return [
    `M ${p.front} ${p.sill - 8}`,
    `Q ${p.front} ${p.nose} ${p.front + 16} ${p.nose - 2}`,
    `L ${p.aBase} ${p.belt}`,
    `L ${p.rear - 12} ${p.tail}`,
    `Q ${p.rear} ${p.tail} ${p.rear} ${p.tail + 12}`,
    `L ${p.rear} ${p.sill - 8}`,
    `Q ${p.rear} ${p.sill} ${p.rear - 8} ${p.sill}`,
    `L ${w2 + arch} ${p.sill}`,
    `A ${arch} ${arch} 0 0 0 ${w2 - arch} ${p.sill}`,
    `L ${w1 + arch} ${p.sill}`,
    `A ${arch} ${arch} 0 0 0 ${w1 - arch} ${p.sill}`,
    `L ${p.front + 8} ${p.sill}`,
    `Q ${p.front} ${p.sill} ${p.front} ${p.sill - 8}`,
    'Z',
  ].join(' ');
}

function Wheel({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#14171d" />
      <circle cx={x} cy={y} r={r * 0.62} fill="#c9ced8" />
      <circle
        cx={x}
        cy={y}
        r={r * 0.62}
        fill="none"
        stroke="#8a93a3"
        strokeWidth="1.5"
        strokeDasharray="3 4"
      />
      <circle cx={x} cy={y} r={r * 0.18} fill="#5b6679" />
    </g>
  );
}

export function VehicleArt({
  vehicle,
  className = '',
}: {
  vehicle: Pick<Vehicle, 'id' | 'make' | 'model' | 'category'>;
  className?: string;
}) {
  const p = PROFILES[vehicle.category];
  const paint = paintFor(vehicle.id);
  const wheelY = 150 - p.radius;

  return (
    <svg
      viewBox="0 0 320 170"
      className={className}
      role="img"
      aria-label={`Illustration of a ${vehicle.make} ${vehicle.model}`}
    >
      <ellipse cx="160" cy="152" rx="138" ry="7" fill="#0b0e13" opacity="0.18" />
      <g transform="translate(320 0) scale(-1 1)">
        {p.bed && (
          <path
            d={`M ${p.cBase + 6} ${p.belt - 2} L ${p.rear - 4} ${p.belt - 2}`}
            stroke={paint}
            strokeWidth="6"
            strokeLinecap="round"
          />
        )}
        {!p.openTop && (
          <path
            d={`M ${p.aBase} ${p.belt + 2} L ${p.roofFront} ${p.roof} L ${p.roofRear} ${p.roof} L ${p.cBase} ${p.belt + 2} Z`}
            fill={paint}
            stroke={paint}
            strokeWidth="8"
            strokeLinejoin="round"
          />
        )}
        {!p.openTop && (
          <path
            d={`M ${p.aBase + 9} ${p.belt - 2} L ${p.roofFront + 3} ${p.roof + 5} L ${p.roofRear - 3} ${p.roof + 5} L ${p.cBase - 9} ${p.belt - 2} Z`}
            fill="#1d2a3a"
            opacity="0.88"
          />
        )}
        {!p.openTop && (
          <rect
            x={(p.roofFront + p.roofRear) / 2 - 2.5}
            y={p.roof + 3}
            width="5"
            height={p.belt - p.roof - 3}
            fill={paint}
          />
        )}
        {p.openTop && (
          <>
            {/* Raked windscreen and two headrests instead of a roof. */}
            <path
              d={`M ${p.aBase} ${p.belt + 1} L ${p.aBase + 20} ${p.belt - 24} L ${p.aBase + 27} ${p.belt - 24} L ${p.aBase + 9} ${p.belt + 1} Z`}
              fill="#1d2a3a"
              opacity="0.9"
            />
            <rect x={p.aBase + 52} y={p.belt - 15} width="10" height="17" rx="4.5" fill="#2a2522" />
            <rect
              x={p.aBase + 100}
              y={p.belt - 12}
              width="10"
              height="14"
              rx="4.5"
              fill="#2a2522"
            />
          </>
        )}
        <path
          d={bodyPath(p)}
          fill={paint}
          stroke="#0b0e13"
          strokeOpacity="0.18"
          strokeWidth="1.2"
        />
        <path
          d={`M ${p.aBase + 4} ${p.belt + 12} L ${p.rear - 18} ${p.tail + 12}`}
          stroke="white"
          strokeOpacity="0.22"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x={p.front + 4} y={p.nose + 2} width="12" height="5" rx="2.5" fill="#fde7b0" />
        <rect x={p.rear - 7} y={p.tail + 4} width="5" height="8" rx="2" fill="#d4402f" />
        <Wheel x={p.wheels[0]} y={wheelY} r={p.radius} />
        <Wheel x={p.wheels[1]} y={wheelY} r={p.radius} />
      </g>
    </svg>
  );
}
