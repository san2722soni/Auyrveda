import { ObjectId } from "mongodb";

export type PreferredContactMethod = "call" | "whatsapp";
export type AppointmentSource = "whatsapp";

export interface Appointment {
  patientName: string;
  phoneNumber: string;
  preferredDate?: string;
  preferredTime?: string;
  reason?: string;
  preferredContactMethod: PreferredContactMethod;
  source: AppointmentSource;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface AppointmentDocument extends Appointment {
  _id: ObjectId;
}

export interface AppointmentResponse extends Omit<Appointment, "createdAt" | "updatedAt" | "completedAt"> {
  id: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
