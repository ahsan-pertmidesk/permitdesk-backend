/** Input for updating a project (name required; email, password, platformName optional) */
export interface UpdateProjectInput {
  name: string;
  platformName?: string;
  email?: string;
  password?: string;
}

/** Input for creating a project. Password is required (no format/length validation). */
export interface CreateProjectInput {
  name: string;
  platformName?: string;
  email: string;
  password: string;
  state: string;
  city: string;
}

/** Project response when email/password are excluded (create, update, list) */
export interface ProjectRecord {
  id: string;
  name: string;
  platformName: string;
  state: string;
  city: string;
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

/** Query filters and pagination for list projects */
export interface ListProjectsFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: 'not_started' | 'in_progress' | 'under_review' | 'approved' | 'failed';
  page?: number;
  limit?: number;
}
