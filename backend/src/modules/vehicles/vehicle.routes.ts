import { Router } from 'express';
import { parseInput } from '../../http/validate.js';
import type { AuthMiddleware } from '../../middleware/authenticate.js';
import {
  createVehicleSchema,
  idParamsSchema,
  listVehiclesQuerySchema,
  searchVehiclesQuerySchema,
} from './vehicle.schemas.js';
import type { VehicleService } from './vehicle.service.js';

interface VehicleRouterDependencies extends AuthMiddleware {
  vehicleService: VehicleService;
}

/**
 * Catalogue endpoints. Reads are public (it is a storefront); every write
 * requires an authenticated ADMIN.
 */
export function createVehicleRouter({
  vehicleService,
  requireAuth,
  requireRole,
}: VehicleRouterDependencies): Router {
  const router = Router();
  const requireAdmin = requireRole('ADMIN');

  router.get('/', async (req, res) => {
    res.json(await vehicleService.search(parseInput(listVehiclesQuerySchema, req.query)));
  });

  // Registered before '/:id' so "search" is not mistaken for a vehicle id.
  router.get('/search', async (req, res) => {
    res.json(await vehicleService.search(parseInput(searchVehiclesQuerySchema, req.query)));
  });

  router.get('/:id', async (req, res) => {
    const { id } = parseInput(idParamsSchema, req.params);
    res.json({ data: await vehicleService.getById(id) });
  });

  router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const input = parseInput(createVehicleSchema, req.body);
    res.status(201).json({ data: await vehicleService.create(input) });
  });

  return router;
}
