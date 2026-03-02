import { CustomError } from '../../middlewares/customError';
import { DBQuery } from '../../services/dbservices';
import { getPermitApplicationByStateAndCity } from '../permitApplicationsCatalog/permitApplicationsCatalog.service';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectRecord,
  ProjectWithApplications,
  ProjectDetail,
  ProjectApplicationItem,
  ListProjectsFilters,
  PaginatedProjects,
} from './project.types';

const ProjectQuery = new DBQuery('Project');
const ProjectApplicationQuery = new DBQuery('ProjectApplication');

/**
 * Create a project: validate state+city exists in catalog, create project (password stored as-is).
 * Multiple projects can use the same email; no duplicate-email check.
 */
export async function createProject(input: CreateProjectInput): Promise<ProjectRecord> {
  const { name, platformName = '', email, password, state, city } = input;

  const catalog = await getPermitApplicationByStateAndCity(state, city);
  if (!catalog) {
    throw new CustomError(
      'No permit applications catalog found for this state and city. Please select a state and city that exist in the catalog.',
      400,
      false
    );
  }

  const project = await ProjectQuery.createData({
    name,
    platformName: (platformName ?? '').trim(),
    email,
    password,
    state: catalog.state,
    city: catalog.city,
  });

  const applicationRecords = catalog.applicationNames.map((appName) => ({
    projectId: project.id,
    name: appName,
    status: 'not_started',
  }));
  if (applicationRecords.length > 0) {
    await ProjectApplicationQuery.createMany(applicationRecords);
  }

  const { password: _, email: __, ...record } = project;
  return record as ProjectRecord;
}

/** Select for list / create / update responses (no email, no password) */
const projectSelectForList = {
  id: true,
  name: true,
  platformName: true,
  state: true,
  city: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

/** Select for get-by-id only (includes email and plain password) */
const projectSelectForGetById = {
  id: true,
  name: true,
  platformName: true,
  email: true,
  password: true,
  state: true,
  city: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

/**
 * Update project: name (required), email and password optional. Password stored as-is when provided.
 */
export async function updateProject(
  projectId: string,
  input: UpdateProjectInput
): Promise<ProjectRecord | null> {
  const existing = await ProjectQuery.findOneByQuery(
    { id: projectId, deletedAt: null },
    undefined,
    projectSelectForList
  );
  if (!existing) return null;

  const updateData: { name: string; platformName?: string; email?: string; password?: string } = {
    name: input.name,
  };
  if (input.platformName !== undefined) updateData.platformName = input.platformName.trim();
  if (input.email !== undefined) updateData.email = input.email.trim();
  if (input.password !== undefined) updateData.password = input.password;

  await ProjectQuery.getByQueryAndUpdate({ id: projectId }, updateData);
  const updated = await ProjectQuery.findOneByQuery(
    { id: projectId, deletedAt: null },
    undefined,
    projectSelectForList
  );
  return updated as ProjectRecord;
}

function mapToApplicationItem(app: { id: string; name: string; status: string }): ProjectApplicationItem {
  return {
    id: app.id,
    name: app.name,
    status: app.status as ProjectApplicationItem['status'],
  };
}

/**
 * Build where clause for list projects: search (name/email), date range, application status.
 */
function buildListWhere(filters: ListProjectsFilters): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
    ];
  }
  if (filters.dateFrom || filters.dateTo) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const d = new Date(filters.dateTo);
      d.setHours(23, 59, 59, 999);
      createdAt.lte = d;
    }
    where.createdAt = createdAt;
  }
  if (filters.status) {
    where.projectApplications = {
      some: { status: filters.status, deletedAt: null },
    };
  }
  return where;
}

/** Select for list with applications (use select only; Prisma does not allow select + include) */
const projectSelectForListWithApplications = {
  ...projectSelectForList,
  projectApplications: {
    where: { deletedAt: null },
    select: { id: true, name: true, status: true },
  },
};

const DEFAULT_LIMIT = 9;
const DEFAULT_PAGE = 1;

/**
 * List projects with optional filters and pagination. Limit default 9. No email, no password.
 */
export async function listProjects(filters: ListProjectsFilters = {}): Promise<PaginatedProjects> {
  const where = buildListWhere(filters);
  const page = Math.max(1, Math.floor(Number(filters.page)) || DEFAULT_PAGE);
  const limit = Math.min(100, Math.max(1, Math.floor(Number(filters.limit)) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    ProjectQuery.findMany(
      where,
      { createdAt: 'desc' },
      projectSelectForListWithApplications,
      undefined,
      skip,
      undefined,
      undefined,
      limit
    ),
    ProjectQuery.countWithDelete(where),
  ]);

  const data = (projects as any[]).map((p) => ({
    ...p,
    applications: (p.projectApplications ?? []).map(mapToApplicationItem),
    projectApplications: undefined,
  })) as ProjectWithApplications[];

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/** Select for get-by-id with applications (use select only; Prisma does not allow select + include) */
const projectSelectForGetByIdWithApplications = {
  ...projectSelectForGetById,
  projectApplications: {
    where: { deletedAt: null },
    select: { id: true, name: true, status: true },
  },
};

/**
 * Get one project by id: includes email and exact password; applications.
 */
export async function getProjectById(id: string): Promise<ProjectDetail | null> {
  const project = await ProjectQuery.findOneByQuery(
    { id, deletedAt: null },
    undefined,
    projectSelectForGetByIdWithApplications
  );
  if (!project) return null;

  const p = project as any;
  return {
    id: p.id,
    name: p.name,
    platformName: p.platformName ?? '',
    email: p.email,
    password: p.password ?? '',
    state: p.state,
    city: p.city,
    applications: (p.projectApplications ?? []).map(mapToApplicationItem),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    deletedAt: p.deletedAt,
  } as ProjectDetail;
}

/** Application statuses that allow project deletion (all applications must be in one of these) */
const DELETABLE_APPLICATION_STATUSES = ['not_started', 'failed', 'approved'] as const;

/**
 * Soft-delete a project by id. Allowed only when every application is in not_started, failed, or approved.
 */
export async function deleteProject(projectId: string): Promise<boolean> {
  const project = await ProjectQuery.findOneByQuery(
    { id: projectId, deletedAt: null },
    undefined,
    {
      id: true,
      projectApplications: {
        where: { deletedAt: null },
        select: { status: true },
      },
    }
  );
  if (!project) return false;

  const applications = (project as any).projectApplications ?? [];
  const notDeletable = applications.find(
    (app: { status: string }) => !DELETABLE_APPLICATION_STATUSES.includes(app.status as any)
  );
  if (notDeletable) {
    throw new CustomError(
      'Project can only be deleted when all applications are in not_started, failed, or approved status. One or more applications are in_progress or under_review.',
      400,
      false
    );
  }

  const now = new Date();
  await ProjectQuery.getByIdAndDelete({ id: projectId }, { deletedAt: now });
  await ProjectApplicationQuery.softDeleteMany({ projectId }, { deletedAt: now });
  return true;
}
