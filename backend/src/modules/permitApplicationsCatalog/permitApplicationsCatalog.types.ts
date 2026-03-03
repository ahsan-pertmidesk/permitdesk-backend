/** Input for creating or updating a permit application (state + city must be unique) */
export interface CreatePermitApplicationInput {
  city: string;
  state: string;
  platformName?: string;
  applicationNames: string[];
}

/** Input for updating application names and/or platform name (state + city identify the record) */
export interface UpdatePermitApplicationInput {
  applicationNames?: string[];
  platformName?: string;
}

/** Permit application as returned from DB */
export interface PermitApplicationRecord {
  id: string;
  city: string;
  state: string;
  platformName: string;
  applicationNames: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
