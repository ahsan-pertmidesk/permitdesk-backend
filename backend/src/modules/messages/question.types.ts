export default interface Question {
  id: string;
  conversationId: string;
  question: string;
  createdAt: Date;
  answer: string | null;
  updatedAt: Date;
  deletedAt?: Date | null;
}

