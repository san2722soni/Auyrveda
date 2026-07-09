import { ObjectId } from "mongodb";

export function isValidObjectId(id: string): boolean {
  if (!ObjectId.isValid(id)) {
    return false;
  }

  return new ObjectId(id).toHexString() === id.toLowerCase();
}
