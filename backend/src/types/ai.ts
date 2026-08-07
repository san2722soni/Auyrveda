export interface AppointmentData {
  patientName: string;
  preferredDate: string;
  preferredTime: string;
  preferredContactMethod: "call" | "whatsapp";
  reason: string;
}

export type AIResult =
  | {
      type: "message";
      reply: string;
      appointment: null;
    }
  | {
      type: "appointment";
      reply: null;
      appointment: AppointmentData;
    };