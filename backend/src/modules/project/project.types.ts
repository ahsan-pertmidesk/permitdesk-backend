/** Input for updating a project (name required; email and password optional) */
export interface UpdateProjectInput {
  name: string;
  email?: string;
  password?: string;
}

/** Input for creating a project */
export interface CreateProjectInput {
  name: string;
  email: string;
  password: string;
  state: string;
  city: string;
}

/** Project response when email/password are excluded (create, update, list) */
export interface ProjectRecord {
  id: string;
  name: string;
  state: string;
  city: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
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

/** Query filters for list projects */
export interface ListProjectsFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: 'not_started' | 'in_progress' | 'under_review' | 'approved' | 'failed';
}
