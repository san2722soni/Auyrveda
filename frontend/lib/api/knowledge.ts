import { apiRequest } from "@/lib/api-client";
import { KnowledgeResponse, KnowledgeUpdateResponse } from "@/types/knowledge";

export function getKnowledge() {
  return apiRequest<KnowledgeResponse>("/api/knowledge");
}

export function updateKnowledge(content: string) {
  return apiRequest<KnowledgeUpdateResponse>("/api/knowledge", {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}
