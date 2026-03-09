import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const ZOTERO_BASE = "https://api.zotero.org";
const USER_ID = process.env.ZOTERO_USER_ID;
const API_KEY = process.env.ZOTERO_API_KEY;

app.get("/api/zotero/items", async (req, res) => {
  try {
    const { limit = "50", collectionKey } = req.query;

    if (!USER_ID || !API_KEY) {
      return res.status(500).json({ error: "Missing ZOTERO_USER_ID or ZOTERO_API_KEY in server/.env" });
    }

    const url = new URL(`${ZOTERO_BASE}/users/${USER_ID}/items`);
    url.searchParams.set("limit", limit);
    url.searchParams.set("format", "json");
    if (collectionKey) url.searchParams.set("collection", collectionKey);

    const resp = await fetch(url.toString(), {
      headers: { "Zotero-API-Key": API_KEY },
    });

    if (!resp.ok) return res.status(resp.status).json({ error: "Zotero API error", details: await resp.text() });

    const data = await resp.json();

    const papers = data.map((item) => {
      const d = item.data || {};
      const creators = Array.isArray(d.creators)
        ? d.creators.map((c) => [c.firstName, c.lastName].filter(Boolean).join(" ").trim()).filter(Boolean).join(", ")
        : "";
      const tags = Array.isArray(d.tags) ? d.tags.map((t) => t.tag).filter(Boolean) : [];

      return {
        zoteroKey: item.key,
        title: d.title || "(Untitled)",
        authors: creators,
        year: (d.date || "").slice(0, 4),
        doi: d.DOI || "",
        tags,
        url: d.url || "",
      };
    });

    res.json({ papers });
  } catch (e) {
    res.status(500).json({ error: "Server error", details: String(e) });
  }
});

app.listen(3001, () => console.log("Zotero proxy on http://localhost:3001"));
