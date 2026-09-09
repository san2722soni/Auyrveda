// AI generation stays outside this lock; final sends and staff actions share it.
// Run one backend process (PM2 fork mode), not a cluster.
const locks = new Map<string, Promise<unknown>>();
export async function withConversationLock<T>(phone: string, action: () => Promise<T>): Promise<T> {
  const current = (locks.get(phone) ?? Promise.resolve()).catch(() => undefined).then(action);
  locks.set(phone, current);
  try { return await current; }
  finally { if (locks.get(phone) === current) locks.delete(phone); }
}
