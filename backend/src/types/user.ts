export interface User {
  phoneNumber: string;

  firstSeenAt: Date;
  lastActiveAt: Date;

  totalMessages: number;

  createdAt: Date;
  updatedAt: Date;
}
