export const APPOINTMENT_STATUSES = ["pending", "done", "all"] as const;

export const APPOINTMENT_CONFIRMATION_MESSAGE =
  "Your appointment request has been submitted successfully. The clinic team will contact you soon.";

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
