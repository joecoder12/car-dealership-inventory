import { Router } from 'express';
import { parseInput } from '../../http/validate.js';
import type { AuthMiddleware } from '../../middleware/authenticate.js';
import { idParamsSchema } from '../vehicles/vehicle.schemas.js';
import {
  purchaseBodySchema,
  purchaseHeadersSchema,
  restockBodySchema,
} from './inventory.schemas.js';
import type { InventoryService } from './inventory.service.js';

interface InventoryRouterDependencies extends AuthMiddleware {
  inventoryService: InventoryService;
}

/** Stock movements. Mounted at /api. */
export function createInventoryRouter({
  inventoryService,
  requireAuth,
  requireRole,
}: InventoryRouterDependencies): Router {
  const router = Router();
  const requireAdmin = requireRole('ADMIN');

  router.post('/vehicles/:id/purchase', requireAuth, async (req, res) => {
    const { id } = parseInput(idParamsSchema, req.params);
    const { quantity } = parseInput(purchaseBodySchema, req.body);
    const { 'Idempotency-Key': idempotencyKey } = parseInput(purchaseHeadersSchema, {
      'Idempotency-Key': req.get('Idempotency-Key'),
    });

    const result = await inventoryService.purchase({
      userId: req.auth!.user.id,
      vehicleId: id,
      quantity,
      idempotencyKey,
    });

    if (result.replayed) res.set('Idempotent-Replayed', 'true');
    res
      .status(result.replayed ? 200 : 201)
      .json({ data: { purchase: result.purchase, vehicle: result.vehicle } });
  });

  router.post('/vehicles/:id/restock', requireAuth, requireAdmin, async (req, res) => {
    const { id } = parseInput(idParamsSchema, req.params);
    const { quantity } = parseInput(restockBodySchema, req.body);
    res.json({ data: await inventoryService.restock(id, quantity) });
  });

  router.get('/inventory/summary', requireAuth, requireAdmin, async (_req, res) => {
    res.json({ data: await inventoryService.summary() });
  });

  return router;
}
