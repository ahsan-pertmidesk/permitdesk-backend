import { Router } from 'express';
import {
  createOrUpdatePermitApplication,
  getPermitApplications,
  getPermitApplicationByStateCity,
  updatePermitApplicationByStateCity,
  deletePermitApplicationByStateCity,
} from './permitApplicationsCatalog.controller';
import { validate, validateQueryParams } from '../../middlewares/validater';
import { isAuthenticate } from '../../middlewares/index';
import {
  createPermitApplicationSchema,
  updatePermitApplicationSchema,
  stateCityQuerySchema,
} from './permitApplicationsCatalog.validator';

export const permitApplicationsRoutes = Router();

// Create or upsert (one per state+city)
permitApplicationsRoutes.post(
  '/',
  isAuthenticate,
  validate(createPermitApplicationSchema),
  createOrUpdatePermitApplication
);

// List all
permitApplicationsRoutes.get('/', isAuthenticate, getPermitApplications);

// Get / update / delete by state and city (query: ?state=...&city=...)
permitApplicationsRoutes.get(
  '/by-state-city',
  isAuthenticate,
  validateQueryParams(stateCityQuerySchema),
  getPermitApplicationByStateCity
);
permitApplicationsRoutes.put(
  '/by-state-city',
  isAuthenticate,
  validateQueryParams(stateCityQuerySchema),
  validate(updatePermitApplicationSchema),
  updatePermitApplicationByStateCity
);
permitApplicationsRoutes.delete(
  '/by-state-city',
  isAuthenticate,
  validateQueryParams(stateCityQuerySchema),
  deletePermitApplicationByStateCity
);

export default permitApplicationsRoutes;
