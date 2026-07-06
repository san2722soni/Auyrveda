import { Collection, ObjectId } from "mongodb";
import {
  Appointment,
  AppointmentDocument,
  AppointmentResponse,
  PreferredContactMethod,
} from "../types/appointment";
import { getDatabase } from "./database";

const COLLECTION_NAME = "appointments";

let indexesReady = false;

export interface CreateAppointmentInput {
  patientName: string;
  phoneNumber: string;
  preferredDate?: string;
  preferredTime?: string;
  reason?: string;
  preferredContactMethod: PreferredContactMethod;
}

async function getAppointmentsCollection(): Promise<Collection<Appointment>> {
  const database = await getDatabase();
  const collection = database.collection<Appointment>(COLLECTION_NAME);

  if (!indexesReady) {
    await collection.createIndex({ isCompleted: 1, createdAt: -1 });
    await collection.createIndex({ phoneNumber: 1, createdAt: -1 });
    indexesReady = true;
  }

  return collection;
}

function toAppointmentResponse(appointment: AppointmentDocument): AppointmentResponse {
  return {
    id: appointment._id.toString(),
    patientName: appointment.patientName,
    phoneNumber: appointment.phoneNumber,
    preferredDate: appointment.preferredDate,
    preferredTime: appointment.preferredTime,
    reason: appointment.reason,
    preferredContactMethod: appointment.preferredContactMethod,
    source: appointment.source,
    isCompleted: appointment.isCompleted,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    completedAt: appointment.completedAt?.toISOString(),
  };
}

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<AppointmentResponse> {
  const now = new Date();
  const appointment: Appointment = {
    patientName: input.patientName,
    phoneNumber: input.phoneNumber,
    preferredDate: input.preferredDate,
    preferredTime: input.preferredTime,
    reason: input.reason,
    preferredContactMethod: input.preferredContactMethod,
    source: "whatsapp",
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
  };

  const collection = await getAppointmentsCollection();
  const result = await collection.insertOne(appointment);

  return toAppointmentResponse({
    ...appointment,
    _id: result.insertedId,
  });
}

export async function listAppointments(): Promise<AppointmentResponse[]> {
  const collection = await getAppointmentsCollection();
  const appointments = await collection
    .find({})
    .sort({ isCompleted: 1, createdAt: -1 })
    .toArray();

  return appointments.map((appointment) =>
    toAppointmentResponse(appointment as AppointmentDocument)
  );
}

export async function setAppointmentCompletion(
  id: string,
  isCompleted: boolean
): Promise<AppointmentResponse | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const now = new Date();
  const collection = await getAppointmentsCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        isCompleted,
        updatedAt: now,
        ...(isCompleted ? { completedAt: now } : {}),
      },
      ...(isCompleted ? {} : { $unset: { completedAt: "" } }),
    },
    { returnDocument: "after" }
  );

  return result ? toAppointmentResponse(result as AppointmentDocument) : null;
}
