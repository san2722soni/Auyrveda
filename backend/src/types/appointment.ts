export type ContactMethod = "call" | "whatsapp";

export interface Appointment {
  sourceMessageId?: string;
  patientName: string;
  phoneNumber: string;
  preferredDate: string;
  preferredTime: string;
  reason: string;
  preferredContactMethod: ContactMethod;
  source: "whatsapp";
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
