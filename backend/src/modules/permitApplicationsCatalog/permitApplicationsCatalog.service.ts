import { CustomError } from '../../middlewares/customError';
import { DBQuery } from '../../services/dbservices';
import type {
  CreatePermitApplicationInput,
  UpdatePermitApplicationInput,
  PermitApplicationRecord,
} from './permitApplicationsCatalog.types';

const PermitApplicationsCatalogQuery = new DBQuery('PermitApplicationsCatalog');

/**
 * Normalize city or state: remove special characters and numbers, collapse spaces, trim, lowercase.
 * Used as first step for consistent lookup and uniqueness.
 */
function normalizeCityAndState(value: string): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[^a-zA-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Title case: first letter capital, and first letter after each space capital (e.g. "new york" -> "New York").
 */
function toTitleCase(value: string): string {
  if (!value) return value;
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Normalize for storage and lookup: cleaned + title case so "New york" and "NEW YORK" both become "New York". */
function normalizeCityAndStateForStorage(value: string): string {
  return toTitleCase(normalizeCityAndState(value));
}

/** Throws 400 if normalized state or city is empty (e.g. only numbers/special chars). */
function ensureNonEmptyNormalized(state: string, city: string): void {
  if (!state || !city) {
    throw new CustomError(
      'State and city must contain at least one letter after removing special characters and numbers',
      400,
      false
    );
  }
}

/**
 * Create or update a permit application for a state+city combination.
 * - Normalizes state and city (removes special chars and numbers).
 * - If an active record exists with same normalized state+city: updates it.
 * - If a soft-deleted record exists: restores it and updates applicationNames.
 * - Otherwise: creates a new record.
 */
export async function upsertPermitApplication(
  input: CreatePermitApplicationInput
): Promise<PermitApplicationRecord> {
  const { state, city, platformName = '', applicationNames } = input;
  const normalizedState = normalizeCityAndStateForStorage(state);
  const normalizedCity = normalizeCityAndStateForStorage(city);

  ensureNonEmptyNormalized(normalizedState, normalizedCity);

  const platformNameTrimmed = (platformName ?? '').trim();
  const record = await PermitApplicationsCatalogQuery.upsert(
    { state_city: { state: normalizedState, city: normalizedCity } },
    { state: normalizedState, city: normalizedCity, platformName: platformNameTrimmed, applicationNames },
    { applicationNames, platformName: platformNameTrimmed, deletedAt: null }
  );
  return record as PermitApplicationRecord;
}

/**
 * Get all permit applications (non-deleted).
 */
export async function listPermitApplications(): Promise<PermitApplicationRecord[]> {
  const list = await PermitApplicationsCatalogQuery.findMany({});
  return list as PermitApplicationRecord[];
}

/**
 * Get one permit application by state and city (lookup uses normalized values).
 */
export async function getPermitApplicationByStateAndCity(
  state: string,
  city: string
): Promise<PermitApplicationRecord | null> {
  const normalizedState = normalizeCityAndStateForStorage(state);
  const normalizedCity = normalizeCityAndStateForStorage(city);
  ensureNonEmptyNormalized(normalizedState, normalizedCity);
  const record = await PermitApplicationsCatalogQuery.findOneByQuery({
    state: normalizedState,
    city: normalizedCity,
    deletedAt: null,
  });
  return record as PermitApplicationRecord | null;
}

/**
 * Get permit applications for multiple state+city pairs (e.g. for enriching project list).
 * Returns records matching any of the pairs; state/city are used as-is (assume already normalized).
 */
export async function getPermitApplicationsByStateCityPairs(
  pairs: { state: string; city: string }[]
): Promise<PermitApplicationRecord[]> {
  if (pairs.length === 0) return [];
  const uniquePairs = Array.from(
    new Map(pairs.map((p) => [`${p.state}|${p.city}`, p])).values()
  );
  const orConditions = uniquePairs.map((p) => ({
    state: p.state,
    city: p.city,
    deletedAt: null,
  }));
  const list = await PermitApplicationsCatalogQuery.findMany({
    OR: orConditions,
  });
  return list as PermitApplicationRecord[];
}

/**
 * Update application names for an existing state+city record (lookup uses normalized values).
 */
export async function updatePermitApplication(
  state: string,
  city: string,
  input: UpdatePermitApplicationInput
): Promise<PermitApplicationRecord | null> {
  const normalizedState = normalizeCityAndStateForStorage(state);
  const normalizedCity = normalizeCityAndStateForStorage(city);
  ensureNonEmptyNormalized(normalizedState, normalizedCity);
  const existing = await PermitApplicationsCatalogQuery.findOneByQuery({
    state: normalizedState,
    city: normalizedCity,
    deletedAt: null,
  });
  if (!existing) return null;
  const updatePayload: { applicationNames?: string[]; platformName?: string } = {};
  if (input.applicationNames !== undefined) updatePayload.applicationNames = input.applicationNames;
  if (input.platformName !== undefined) updatePayload.platformName = input.platformName.trim();
  const updated = await PermitApplicationsCatalogQuery.getByQueryAndUpdate(
    { id: existing.id },
    updatePayload
  );
  return updated as PermitApplicationRecord;
}

/**
 * Soft-delete a permit application by state and city (lookup uses normalized values).
 */
export async function deletePermitApplication(
  state: string,
  city: string
): Promise<boolean> {
  const normalizedState = normalizeCityAndStateForStorage(state);
  const normalizedCity = normalizeCityAndStateForStorage(city);
  ensureNonEmptyNormalized(normalizedState, normalizedCity);
  const existing = await PermitApplicationsCatalogQuery.findOneByQuery({
    state: normalizedState,
    city: normalizedCity,
    deletedAt: null,
  });
  if (!existing) return false;
  await PermitApplicationsCatalogQuery.getByIdAndDelete(
    { id: existing.id },
    { deletedAt: new Date() }
  );
  return true;
}
