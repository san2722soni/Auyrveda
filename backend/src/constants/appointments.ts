export const APPOINTMENT_STATUSES = ["pending", "done", "all"] as const;

export const APPOINTMENT_CONFIRMATION_MESSAGE =
  "Your appointment request has been submitted successfully. The clinic team will contact you soon.";

export const APPOINTMENT_DETAILS_REQUEST_MESSAGE =
  "Please share these appointment details (together or separately):\n\n1. Full name\n2. Preferred date\n3. Preferred time\n4. Reason/problem\n5. Preferred contact method: call or WhatsApp";

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
