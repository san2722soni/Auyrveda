import { readFile } from "node:fs/promises";
import { join } from "node:path";

const KNOWLEDGE_PATH = join(process.cwd(), "knowledge.md");

export async function getKnowledge(): Promise<string> {
    return await readFile(KNOWLEDGE_PATH, "utf-8");
}