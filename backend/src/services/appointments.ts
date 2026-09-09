import { Collection, Filter, ObjectId, UpdateFilter } from "mongodb";
import { AppointmentStatus } from "../constants/appointments";
import { COLLECTIONS } from "../constants/database";
import {
  createPaginationMeta,
  normalizePagination,
  PaginationInput,
  PaginationMeta,
} from "../lib/pagination";
import { escapeRegExp } from "../lib/regex";
import { isValidObjectId } from "../lib/object-id";
import { getDatabase } from "./database";
import { Appointment } from "../types/appointment";
import { addDays, toDateKey } from "../lib/clinic-date";

function getAppointmentsCollection(): Collection<Appointment> {
  return getDatabase().collection<Appointment>(COLLECTIONS.appointments);
}

interface CreateAppointmentInput {
  sourceMessageId?: string;
  patientName: string;
  phoneNumber: string;
  preferredDate: string;
  preferredTime: string;
  reason: string;
  preferredContactMethod: "call" | "whatsapp";
}

interface GetAppointmentsInput extends PaginationInput {
  status?: AppointmentStatus;
  dateCategory?: "all" | "today" | "upcoming" | "past";
  search?: string;
}

export interface PaginatedAppointments {
  data: Appointment[];
  pagination: PaginationMeta;
}

export type UpdateAppointmentStatusResult =
  | {
      ok: true;
      appointment: Appointment & { _id: ObjectId };
    }
  | {
      ok: false;
      reason: "invalid-id" | "not-found";
    };

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

  if (data.sourceMessageId) {
    return (await collection.findOneAndUpdate(
      { sourceMessageId: data.sourceMessageId }, { $setOnInsert: appointment },
      { upsert: true, returnDocument: "after" }))!;
  }

  const result = await collection.insertOne(appointment);

  return {
    _id: result.insertedId,
    ...appointment,
  };
}

export async function getAppointments(
  input: GetAppointmentsInput = {}
): Promise<PaginatedAppointments> {
  const { page, limit } = normalizePagination(input);
  const skip = (page - 1) * limit;
  const status = input.status ?? "all";
  const dateCategory = input.dateCategory ?? "all";
  const search = input.search?.trim();
  const query: Filter<Appointment> = {};

  if (status === "pending") {
    query.isCompleted = false;
  }

  if (status === "done") {
    query.isCompleted = true;
  }

  if (dateCategory !== "all") {
    const now = new Date();
    const today = toDateKey(now);

    if (dateCategory === "today") {
      query.preferredDate = today;
    }

    if (dateCategory === "upcoming") {
      query.preferredDate = { $gte: toDateKey(addDays(now, 1)) };
    }

    if (dateCategory === "past") {
      query.preferredDate = { $lt: today };
    }
  }

  if (search) {
    const regex = { $regex: escapeRegExp(search), $options: "i" };

    query.$or = [
      { patientName: regex },
      { phoneNumber: regex },
    ];
  }

  const collection = getAppointmentsCollection();
  const [data, total] = await Promise.all([
    collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(query),
  ]);

  return {
    data,
    pagination: createPaginationMeta(page, limit, total),
  };
}

export async function updateAppointmentStatus(
  id: string,
  isCompleted: boolean
): Promise<UpdateAppointmentStatusResult> {
  if (!isValidObjectId(id)) {
    return {
      ok: false,
      reason: "invalid-id",
    };
  }

  const now = new Date();
  const collection = getAppointmentsCollection();
  const update: UpdateFilter<Appointment> = isCompleted
    ? {
        $set: {
          isCompleted: true,
          completedAt: now,
          updatedAt: now,
        },
      }
    : {
        $set: {
          isCompleted: false,
          updatedAt: now,
        },
        $unset: {
          completedAt: "" as const,
        },
      };

  const appointment = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    update,
    { returnDocument: "after" }
  );

  if (!appointment) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  return {
    ok: true,
    appointment,
  };
}
