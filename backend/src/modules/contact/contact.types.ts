export default interface Contact {
  id: string;
  email: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  message?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateContactInput {
  email: string;
  fullName?: string;
  phoneNumber?: string;
  message?: string;
}

export interface UpdateContactInput {
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  message?: string;
}

