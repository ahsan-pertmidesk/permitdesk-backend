import ApiResponse from '../../middlewares/apiResponse';
import { catchAsync } from '../../middlewares/index';
import {
  upsertPermitApplication,
  listPermitApplications,
  getPermitApplicationByStateAndCity,
  updatePermitApplication,
  deletePermitApplication,
} from './permitApplicationsCatalog.service';
import type { CreatePermitApplicationInput, UpdatePermitApplicationInput } from './permitApplicationsCatalog.types';

/**
 * POST /permit-applications
 * Create or update a permit application (one record per state+city combination).
 */
export const createOrUpdatePermitApplication = catchAsync(async (req, res) => {
  const data = req.body as CreatePermitApplicationInput;
  const record = await upsertPermitApplication(data);
  return res
    .status(201)
    .json(new ApiResponse(201, 'Permit application saved successfully', record));
});

/**
 * GET /permit-applications
 * List all permit applications.
 */
export const getPermitApplications = catchAsync(async (req, res) => {
  const list = await listPermitApplications();
  return res
    .status(200)
    .json(new ApiResponse(200, 'Permit applications retrieved successfully', list));
});

/**
 * GET /permit-applications/by-state-city?state=...&city=...
 * Get one permit application by state and city.
 */
export const getPermitApplicationByStateCity = catchAsync(async (req, res) => {
  const { state, city } = req.query as { state: string; city: string };
  const record = await getPermitApplicationByStateAndCity(state, city);
  if (!record) {
    return res
      .status(404)
      .json(new ApiResponse(404, 'Permit application not found', null));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, 'Permit application retrieved successfully', record));
});

/**
 * PUT /permit-applications/by-state-city?state=...&city=...
 * Update application names for a state+city record.
 */
export const updatePermitApplicationByStateCity = catchAsync(async (req, res) => {
  const { state, city } = req.query as { state: string; city: string };
  const data = req.body as UpdatePermitApplicationInput;
  const record = await updatePermitApplication(state, city, data);
  if (!record) {
    return res
      .status(404)
      .json(new ApiResponse(404, 'Permit application not found', null));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, 'Permit application updated successfully', record));
});

/**
 * DELETE /permit-applications/by-state-city?state=...&city=...
 * Soft-delete a permit application.
 */
export const deletePermitApplicationByStateCity = catchAsync(async (req, res) => {
  const { state, city } = req.query as { state: string; city: string };
  const deleted = await deletePermitApplication(state, city);
  if (!deleted) {
    return res
      .status(404)
      .json(new ApiResponse(404, 'Permit application not found', null));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, 'Permit application deleted successfully', null));
});
