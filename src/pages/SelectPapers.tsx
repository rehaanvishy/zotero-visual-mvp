import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchZoteroItems } from "../api";
import type { ZoteroItem } from "../types";

export default function SelectPapers({ mvp }: { mvp: any }) {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onImport() {
    setLoading(true);
    setError(null);
    try {
      const items: ZoteroItem[] = await fetchZoteroItems();
      mvp.setLibraryItems(items);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const canNext = mvp.selectedKeys.length > 0;

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h2>Select Papers (max 5)</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <button onClick={onImport} disabled={loading}>
          {loading ? "Importing..." : "Import from Zotero (metadata)"}
        </button>
        <button onClick={() => nav("/themes")} disabled={!canNext}>
          Next: Themes
        </button>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <p>
        Selected: <b>{mvp.selectedKeys.length}</b>/5
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
        {mvp.libraryItems.map((it: ZoteroItem) => {
          const checked = mvp.selectedKeys.includes(it.key);
          const disableNew = !checked && mvp.selectedKeys.length >= 5;

          return (
            <div
              key={it.key}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
                opacity: disableNew ? 0.6 : 1,
              }}
            >
              <label style={{ display: "flex", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disableNew}
                  onChange={() => mvp.toggleSelect(it.key)}
                />
                <div>
                  <div style={{ fontWeight: 650 }}>{it.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {it.creators} {it.date ? `(${it.date})` : ""} {it.doi ? `— ${it.doi}` : ""}
                  </div>
                </div>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
