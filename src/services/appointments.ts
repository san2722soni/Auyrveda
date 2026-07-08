import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "./database";
import { Appointment } from "../types/appointment";

function getAppointmentsCollection(): Collection<Appointment> {
  return getDatabase().collection<Appointment>("appointments");
}

interface CreateAppointmentInput {
  patientName: string;
  phoneNumber: string;
  preferredDate: string;
  preferredTime: string;
  reason: string;
  preferredContactMethod: "call" | "whatsapp";
}

export async function createAppointment(
  data: CreateAppointmentInput
): Promise<Appointment & { _id: ObjectId }> {
  const now = new Date();

  const appointment: Appointment = {
    ...data,
    source: "whatsapp",
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
  };

  const collection = getAppointmentsCollection();

  const result = await collection.insertOne(appointment);

  return {
    _id: result.insertedId,
    ...appointment,
  };
}