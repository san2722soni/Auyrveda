import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  KNOWLEDGE_FILE_NAME,
  MAX_KNOWLEDGE_CONTENT_LENGTH,
} from "../constants/knowledge";

const KNOWLEDGE_PATH = resolve(__dirname, "..", "..", KNOWLEDGE_FILE_NAME);
export { MAX_KNOWLEDGE_CONTENT_LENGTH };

export async function getKnowledge(): Promise<string> {
  return await readFile(KNOWLEDGE_PATH, "utf-8");
}

export async function updateKnowledge(content: string): Promise<void> {
  const tempPath = join(
    dirname(KNOWLEDGE_PATH),
    `.knowledge.${process.pid}.${Date.now()}.tmp`
  );

  try {
    await writeFile(tempPath, content, { encoding: "utf-8", flag: "wx" });
    await rename(tempPath, KNOWLEDGE_PATH);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);

    throw error;
  }
}
