/** Input for updating a project (name required; email, password optional) */
export interface UpdateProjectInput {
  name: string;
  email?: string;
  password?: string;
}

/** Input for creating a project. Password is required (no format/length validation). */
export interface CreateProjectInput {
  name: string;
  email: string;
  password: string;
  state: string;
  city: string;
}

/** Project response (create/update exclude email; list includes email). platformName stored from catalog on create, not editable. */
export interface ProjectRecord {
  id: string;
  name: string;
  state: string;
  city: string;
  platformName: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Paginated list response */
export interface PaginatedProjects {
  data: ProjectWithApplications[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Project with applications, no email (list response) */
export interface ProjectWithApplications extends ProjectRecord {
  applications: ProjectApplicationItem[];
}

/** Project detail with email and exact password (get by id only) */
export interface ProjectDetail extends ProjectRecord {
  email: string;
  password: string;
  applications: ProjectApplicationItem[];
}

/** Stored project application (name + status) */
export interface ProjectApplicationItem {
  id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'under_review' | 'approved' | 'failed';
}

/** Date filter presets (no custom range) */
export type DateFilterPreset = 'today' | 'last_7_days' | 'last_30_days';

/** Query filters and pagination for list projects */
export interface ListProjectsFilters {
  search?: string;
  dateFilter?: DateFilterPreset;
  status?: string[]; /** multi-select: at least one application with status in this list */
  page?: number;
  limit?: number;
}
