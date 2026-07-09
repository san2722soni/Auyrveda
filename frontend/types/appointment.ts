export type ContactMethod = "call" | "whatsapp";
export type AppointmentStatus = "all" | "pending" | "done";

export interface Appointment {
  _id?: string;
  patientName: string;
  phoneNumber: string;
  preferredDate: string;
  preferredTime: string;
  reason: string;
  preferredContactMethod: ContactMethod;
  source: "whatsapp";
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
