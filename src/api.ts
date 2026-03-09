// src/api.ts
import type { ZoteroItem } from "./types";

const API_BASE = "http://localhost:3001";

export async function fetchZoteroItems(): Promise<ZoteroItem[]> {
  const r = await fetch(`${API_BASE}/api/zotero/items`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* ✅ NEW: export Map View -> create Zotero standalone note + update items */
export type ExportMapNotePayload = {
  noteTitle: string;
  noteContent: string; // what you already generate for the proxy note
  itemKeys: string[]; // Zotero item keys (papers)
  itemTags: Record<string, string[]>; // key -> tags (themes)
};

export type ExportMapNoteResponse = {
  ok: true;
  noteKey: string;
};

export async function exportMapNoteToZotero(
  payload: ExportMapNotePayload
): Promise<ExportMapNoteResponse> {
  const r = await fetch(`${API_BASE}/api/zotero/export-map-note`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!r.ok) throw new Error(await r.text());
  return r.json();
}