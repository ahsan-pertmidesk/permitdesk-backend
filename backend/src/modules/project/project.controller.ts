import ApiResponse from '../../middlewares/apiResponse';
import { catchAsync } from '../../middlewares/index';
import { createProject, listProjects, getProjectById, updateProject, deleteProject } from './project.service';
import type { CreateProjectInput, UpdateProjectInput, ListProjectsFilters } from './project.types';

/**
 * POST /projects
 * Create a project (name, platformName?, email, password, state, city).
 * Multiple projects can use the same email. State+city must exist in catalog.
 */
export const createProjectHandler = catchAsync(async (req, res) => {
  const data = req.body as CreateProjectInput;
  const project = await createProject(data);
  return res
    .status(201)
    .json(new ApiResponse(201, 'Project created successfully', project));
});

/**
 * GET /projects
 * List projects with optional query: search, dateFrom, dateTo, status, page, limit (default 9).
 * Returns paginated result: { data, total, page, limit, totalPages }.
 */
export const getProjectsHandler = catchAsync(async (req, res) => {
  const filters: ListProjectsFilters = {
    search: req.query.search as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    status: req.query.status as ListProjectsFilters['status'],
    page: req.query.page !== undefined ? Number(req.query.page) : undefined,
    limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
  };
  const result = await listProjects(filters);
  return res
    .status(200)
    .json(new ApiResponse(200, 'Projects retrieved successfully', result));
});

/**
 * GET /projects/:id
 * Get one project by id with applications from catalog.
 */
export const getProjectByIdHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const project = await getProjectById(id);
  if (!project) {
    return res
      .status(404)
      .json(new ApiResponse(404, 'Project not found', null));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, 'Project retrieved successfully', project));
});

/**
 * PUT /projects/:id
 * Edit project: only name can be updated.
 */
export const updateProjectHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const data = req.body as UpdateProjectInput;
  const project = await updateProject(id, data);
  if (!project) {
    return res
      .status(404)
      .json(new ApiResponse(404, 'Project not found', null));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, 'Project updated successfully', project));
});

/**
 * DELETE /projects/:id
 * Soft-delete a project.
 */
export const deleteProjectHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const deleted = await deleteProject(id);
  if (!deleted) {
    return res
      .status(404)
      .json(new ApiResponse(404, 'Project not found', null));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, 'Project deleted successfully', null));
});
