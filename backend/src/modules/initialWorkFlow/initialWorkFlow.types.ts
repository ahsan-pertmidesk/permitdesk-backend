export default interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

