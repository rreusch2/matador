import { Router } from 'express';
import { z } from 'zod';

import { badRequest } from '../../lib/errors.js';
import { authed, requireAuth } from '../../middleware/auth.js';
import { userBurstLimiter } from '../../middleware/rateLimit.js';
import { validateBody } from '../../middleware/validate.js';
import { generateInput, type GenerateInput } from './workouts.schema.js';
import { completePlan, deletePlan, generatePlan, listPlans } from './workouts.service.js';

export const workoutsRouter = Router();

workoutsRouter.use(requireAuth);

/** POST /v1/workouts/generate - build a personalized session. */
workoutsRouter.post('/generate', userBurstLimiter(4), validateBody(generateInput), async (req, res) => {
  const { user, db } = authed(req);
  const plan = await generatePlan(db, user.id, req.body as GenerateInput);
  res.status(201).json({ plan });
});

/** GET /v1/workouts/plans - most recent sessions for the signed-in user. */
workoutsRouter.get('/plans', async (req, res) => {
  const { db } = authed(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  res.json({ plans: await listPlans(db, limit) });
});

/** POST /v1/workouts/plans/:id/complete - mark a session as done. */
workoutsRouter.post('/plans/:id/complete', async (req, res) => {
  const { db } = authed(req);
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) throw badRequest('Invalid session id.');
  await completePlan(db, id.data);
  res.status(204).end();
});

/** DELETE /v1/workouts/plans/:id - remove a saved session. */
workoutsRouter.delete('/plans/:id', async (req, res) => {
  const { db } = authed(req);
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) throw badRequest('Invalid session id.');
  await deletePlan(db, id.data);
  res.status(204).end();
});
