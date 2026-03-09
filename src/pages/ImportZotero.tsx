import { useState } from "react";

type ZoteroPaper = {
  zoteroKey: string;
  title: string;
  authors: string;
  year: string;
  doi: string;
  tags: string[];
  url: string;
};

export default function ImportZotero({ onImport }: { onImport: (papers: ZoteroPaper[]) => void }) {
  const [userId, setUserId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [collectionKey, setCollectionKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function fetchItems() {
    setErr("");
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        userId,
        apiKey,
        limit: "100",
      });
      if (collectionKey.trim()) qs.set("collectionKey", collectionKey.trim());

      const resp = await fetch(`http://localhost:3001/api/zotero/items?${qs.toString()}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.details || "Failed to fetch items");
      onImport(json.papers);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h2>Import from Zotero (Metadata)</h2>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          User ID
          <input value={userId} onChange={(e) => setUserId(e.target.value)} style={{ width: "100%" }} />
        </label>

        <label>
          API Key
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{ width: "100%" }} />
        </label>

        <label>
          Collection Key (optional)
          <input
            value={collectionKey}
            onChange={(e) => setCollectionKey(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <button disabled={loading || !userId || !apiKey} onClick={fetchItems}>
          {loading ? "Importing..." : "Import Papers"}
        </button>

        {err && <div style={{ color: "crimson" }}>{err}</div>}

        <p style={{ opacity: 0.75, marginTop: 8 }}>
          This imports titles/authors/year/tags (no PDFs). You can then select up to 5 papers for the demo.
        </p>
      </div>
    </div>
  );
}
