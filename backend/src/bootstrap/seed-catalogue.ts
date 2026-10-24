import type { Database } from '../db/client.js';
import type { FuelType, VehicleCategory } from '../generated/prisma/enums.js';

interface DemoVehicle {
  make: string;
  model: string;
  category: VehicleCategory;
  price: string;
  quantity: number;
  year: number;
  fuelType: FuelType;
  description: string;
}

/**
 * Development/demo catalogue. Prices are illustrative list prices in USD.
 * A few entries are deliberately sold out so the UI's zero-stock state shows.
 */
export const DEMO_VEHICLES: readonly DemoVehicle[] = [
  {
    make: 'Toyota',
    model: 'Camry XSE',
    category: 'SEDAN',
    price: '31250.00',
    quantity: 6,
    year: 2025,
    fuelType: 'HYBRID',
    description:
      'Efficient mid-size hybrid sedan with a sport-tuned suspension and a quiet, roomy cabin.',
  },
  {
    make: 'Tesla',
    model: 'Model 3 Long Range',
    category: 'SEDAN',
    price: '47490.00',
    quantity: 3,
    year: 2025,
    fuelType: 'ELECTRIC',
    description: 'Dual-motor all-wheel drive with a long-range battery and minimalist interior.',
  },
  {
    make: 'Mercedes-Benz',
    model: 'E 350',
    category: 'SEDAN',
    price: '63500.00',
    quantity: 3,
    year: 2025,
    fuelType: 'PETROL',
    description: 'Executive sedan balancing comfort, refinement and modern driver assistance.',
  },
  {
    make: 'Honda',
    model: 'Civic Sport Hatchback',
    category: 'HATCHBACK',
    price: '27400.00',
    quantity: 4,
    year: 2025,
    fuelType: 'PETROL',
    description: 'Practical, fun-to-drive hatchback with a flexible cargo area.',
  },
  {
    make: 'Volkswagen',
    model: 'Golf GTI',
    category: 'HATCHBACK',
    price: '33000.00',
    quantity: 5,
    year: 2024,
    fuelType: 'PETROL',
    description: 'Turbocharged hot hatch with sharp handling and everyday usability.',
  },
  {
    make: 'Toyota',
    model: 'RAV4 Hybrid XLE',
    category: 'SUV',
    price: '34800.00',
    quantity: 0,
    year: 2025,
    fuelType: 'HYBRID',
    description: 'Compact hybrid SUV with standard all-wheel drive. Currently sold out.',
  },
  {
    make: 'BMW',
    model: 'X5 xDrive40i',
    category: 'SUV',
    price: '68600.00',
    quantity: 1,
    year: 2025,
    fuelType: 'PETROL',
    description: 'Luxury mid-size SUV with a smooth inline-six and a premium cabin.',
  },
  {
    make: 'Hyundai',
    model: 'Ioniq 5 Limited',
    category: 'SUV',
    price: '52600.00',
    quantity: 4,
    year: 2025,
    fuelType: 'ELECTRIC',
    description: 'Ultra-fast-charging electric crossover with a spacious, lounge-like interior.',
  },
  {
    make: 'Ford',
    model: 'F-150 Lariat',
    category: 'TRUCK',
    price: '63900.00',
    quantity: 2,
    year: 2024,
    fuelType: 'PETROL',
    description: 'Full-size pickup with strong towing capability and a well-appointed crew cab.',
  },
  {
    make: 'Chevrolet',
    model: 'Silverado 2500HD',
    category: 'TRUCK',
    price: '58400.00',
    quantity: 2,
    year: 2024,
    fuelType: 'DIESEL',
    description: 'Heavy-duty diesel truck built for serious hauling and towing.',
  },
  {
    make: 'Rivian',
    model: 'R1T Adventure',
    category: 'TRUCK',
    price: '79000.00',
    quantity: 1,
    year: 2025,
    fuelType: 'ELECTRIC',
    description: 'Electric adventure truck with quad-motor traction and clever storage.',
  },
  {
    make: 'Porsche',
    model: '911 Carrera',
    category: 'COUPE',
    price: '122900.00',
    quantity: 1,
    year: 2024,
    fuelType: 'PETROL',
    description: 'Iconic rear-engine sports coupe with precise steering and timeless design.',
  },
  {
    make: 'Ford',
    model: 'Mustang GT',
    category: 'COUPE',
    price: '46000.00',
    quantity: 0,
    year: 2025,
    fuelType: 'PETROL',
    description: 'V8 muscle coupe with a manual option. Currently sold out.',
  },
  {
    make: 'Mazda',
    model: 'MX-5 Miata RF',
    category: 'CONVERTIBLE',
    price: '37850.00',
    quantity: 2,
    year: 2025,
    fuelType: 'PETROL',
    description: 'Lightweight roadster with a retractable hardtop and pure driving feel.',
  },
  {
    make: 'BMW',
    model: '430i Convertible',
    category: 'CONVERTIBLE',
    price: '63000.00',
    quantity: 0,
    year: 2025,
    fuelType: 'PETROL',
    description: 'Four-seat soft-top convertible for open-air touring. Currently sold out.',
  },
  {
    make: 'Volvo',
    model: 'V90 Cross Country',
    category: 'WAGON',
    price: '58950.00',
    quantity: 2,
    year: 2024,
    fuelType: 'HYBRID',
    description: 'Raised luxury wagon with all-wheel drive and Scandinavian interior design.',
  },
  {
    make: 'Subaru',
    model: 'Outback Wilderness',
    category: 'WAGON',
    price: '41800.00',
    quantity: 3,
    year: 2025,
    fuelType: 'PETROL',
    description: 'Rugged, high-clearance wagon ready for gravel roads and campsites.',
  },
  {
    make: 'Kia',
    model: 'Carnival SX',
    category: 'VAN',
    price: '47500.00',
    quantity: 3,
    year: 2025,
    fuelType: 'PETROL',
    description: 'Eight-seat family van with sliding doors and an SUV-inspired look.',
  },
  {
    make: 'Honda',
    model: 'Odyssey Touring',
    category: 'VAN',
    price: '46500.00',
    quantity: 2,
    year: 2025,
    fuelType: 'PETROL',
    description: 'Comfortable minivan with flexible seating and family-friendly tech.',
  },
];

/**
 * Inserts any demo vehicle that is not already present (matched on make,
 * model and year). Safe to run repeatedly; never overwrites existing rows and
 * never creates user accounts.
 */
export async function seedCatalogue(db: Database): Promise<{ created: number; skipped: number }> {
  let created = 0;
  for (const vehicle of DEMO_VEHICLES) {
    const existing = await db.vehicle.findFirst({
      where: { make: vehicle.make, model: vehicle.model, year: vehicle.year },
      select: { id: true },
    });
    if (existing) continue;

    await db.vehicle.create({ data: vehicle });
    created += 1;
  }
  return { created, skipped: DEMO_VEHICLES.length - created };
}
