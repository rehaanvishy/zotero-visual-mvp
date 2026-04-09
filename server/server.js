import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const ZOTERO_API_KEY = process.env.ZOTERO_API_KEY;
const ZOTERO_USER_ID = process.env.ZOTERO_USER_ID;
const PORT = process.env.PORT || 3001;

if (!ZOTERO_API_KEY || !ZOTERO_USER_ID) {
  console.warn("Missing ZOTERO_API_KEY or ZOTERO_USER_ID in .env");
}

const ZOTERO_API_VERSION = "3";
const ZOTERO_BASE = "https://api.zotero.org";

function zoteroHeaders(extra = {}) {
  return {
    "Zotero-API-Version": ZOTERO_API_VERSION,
    Authorization: `Bearer ${ZOTERO_API_KEY}`,
    ...extra,
  };
}

function itemUri(key) {
  return `http://zotero.org/users/${ZOTERO_USER_ID}/items/${key}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uniqStrings(xs) {
  return Array.from(
    new Set(
      (Array.isArray(xs) ? xs : [])
        .map((x) => String(x || "").trim())
        .filter(Boolean)
    )
  );
}

function buildNoteHtml({ title, papers, autoLinks, manualLinks }) {
  const safeTitle = escapeHtml(title || "Map View Export — Proxy Note");

  const papersHtml = papers
    .map((p, idx) => {
      const t = escapeHtml(p.title);
      const themeTags = uniqStrings(p.themes || []).map(escapeHtml).join(", ");
      const existingTags = uniqStrings(p.existingTags || []).map(escapeHtml).join(", ");

      return `
        <p>
          <b>${idx + 1}. ${t}</b><br/>
          <span>Theme Tags: ${themeTags || "—"}</span><br/>
          <span>Existing Zotero Tags: ${existingTags || "—"}</span>
        </p>
      `;
    })
    .join("");

  const autoHtml =
    (autoLinks?.length || 0) === 0
      ? `<p>—</p>`
      : autoLinks
          .map((l) => {
            const theme = escapeHtml(l.theme);
            const from = escapeHtml(l.fromTitle);
            const to = escapeHtml(l.toTitle);
            return `<p><b>${theme}:</b><br/>${from} → ${to}</p>`;
          })
          .join("");

  const manualHtml =
    (manualLinks?.length || 0) === 0
      ? `<p>—</p>`
      : manualLinks
          .map((l) => {
            const from = escapeHtml(l.fromTitle);
            const to = escapeHtml(l.toTitle);
            const type = escapeHtml(l.type);
            const note = l.note ? escapeHtml(l.note) : "";
            return `<p><b>${from} → ${to}</b><br/>Type: ${type}${note ? `<br/>Note: ${note}` : ""}</p>`;
          })
          .join("");

  const relatedHtml = papers.map((p) => `<li>${escapeHtml(p.title)}</li>`).join("");

  return `
    <h1>${safeTitle}</h1>
    <h2>Papers</h2>
    ${papersHtml}
    <h2>Auto Links (Theme Overlap)</h2>
    ${autoHtml}
    <h2>Manual Links</h2>
    ${manualHtml}
    <h2>Related (Auto-populated in Zotero)</h2>
    <ul>${relatedHtml}</ul>
    <p><i>END MAP VIEW EXPORT</i></p>
  `;
}

// Simple health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/**
 * Fetches top-level Zotero items (metadata only, no PDFs)
 */
app.get("/api/zotero/items", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 200);
    const start = Math.max(Number(req.query.start || 0), 0);

    const url =
      `https://api.zotero.org/users/${ZOTERO_USER_ID}/items/top` +
      `?format=json&include=data&limit=${limit}&start=${start}`;

    const r = await fetch(url, { headers: zoteroHeaders() });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }

    const items = await r.json();

    const cleaned = items
      .filter((it) => it?.data?.itemType && !["attachment", "note"].includes(it.data.itemType))
      .map((it) => ({
        key: it.key,
        itemType: it.data.itemType,
        title: it.data.title || "(Untitled)",
        creators: (it.data.creators || [])
          .map((c) => [c.lastName, c.firstName].filter(Boolean).join(", "))
          .filter(Boolean)
          .slice(0, 3)
          .join("; "),
        date: it.data.date || "",
        publicationTitle: it.data.publicationTitle || "",
        doi: it.data.DOI || it.data.doi || "",
        url: it.data.url || "",
        tags: (it.data.tags || []).map((t) => t.tag),
      }));

    res.json(cleaned);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/**
 * EXPORT → Create a Zotero standalone note + relate items + apply theme tags to each item.
 *
 * Body:
 * {
 *   title: string,
 *   papers: [{ key, title, themes: string[], existingTags: string[] }],
 *   autoLinks: [{ theme, fromKey, toKey, fromTitle, toTitle }],
 *   manualLinks: [{ fromKey, toKey, fromTitle, toTitle, type, note? }]
 * }
 */
app.post("/api/zotero/export-note", async (req, res) => {
  try {
    if (!ZOTERO_API_KEY || !ZOTERO_USER_ID) {
      return res.status(500).json({ error: "Missing ZOTERO_API_KEY or ZOTERO_USER_ID in .env" });
    }

    const { title, papers = [], autoLinks = [], manualLinks = [] } = req.body || {};

    if (!Array.isArray(papers) || papers.length === 0) {
      return res.status(400).json({ error: "No papers provided" });
    }

    // NOTE TAGS (Option 1): union(theme tags + existing zotero tags across all selected papers)
    const allThemeTags = papers.flatMap((p) => uniqStrings(p.themes || []));
    const allExistingTags = papers.flatMap((p) => uniqStrings(p.existingTags || []));
    const noteTags = uniqStrings([...allThemeTags, ...allExistingTags]).map((tag) => ({ tag }));

    // 1) Create standalone note with relations (Related section)
    const noteHtml = buildNoteHtml({ title, papers, autoLinks, manualLinks });

    const relations = {
      "dc:relation": papers.map((p) => itemUri(p.key)),
    };

    const noteItem = {
      itemType: "note",
      note: noteHtml,
      relations,
      tags: noteTags, 
    };

    const createUrl = `${ZOTERO_BASE}/users/${ZOTERO_USER_ID}/items`;

    const createResp = await fetch(createUrl, {
      method: "POST",
      headers: zoteroHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify([noteItem]),
    });

    if (!createResp.ok) {
      const text = await createResp.text();
      return res.status(createResp.status).json({ error: "Failed to create note", details: text });
    }

    const created = await createResp.json();
    const createdNoteKey = created?.successful?.["0"]?.key || created?.successful?.[0]?.key;

    // 2) Apply theme tags to each paper (merge with existing tags already in Zotero)
    const themeByKey = new Map();
    for (const p of papers) {
      themeByKey.set(p.key, uniqStrings(p.themes || []));
    }

    async function fetchItem(key) {
      const r = await fetch(`${ZOTERO_BASE}/users/${ZOTERO_USER_ID}/items/${key}?format=json&include=data`, {
        headers: zoteroHeaders(),
      });
      if (!r.ok) throw new Error(await r.text());
      const json = await r.json();
      const version = r.headers.get("Last-Modified-Version");
      return { key, data: json?.data, version: version ? Number(version) : undefined };
    }

    async function putItem(key, data, version) {
      const r = await fetch(`${ZOTERO_BASE}/users/${ZOTERO_USER_ID}/items/${key}`, {
        method: "PUT",
        headers: zoteroHeaders({
          "Content-Type": "application/json",
          ...(version ? { "If-Unmodified-Since-Version": String(version) } : {}),
        }),
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error(await r.text());
      return true;
    }

    for (const p of papers) {
      const themes = themeByKey.get(p.key) || [];
      if (themes.length === 0) continue;

      const { data, version } = await fetchItem(p.key);

      const existingTags = Array.isArray(data?.tags) ? data.tags.map((t) => t.tag).filter(Boolean) : [];
      const merged = uniqStrings([...existingTags, ...themes]);

      const updated = {
        ...data,
        tags: merged.map((tag) => ({ tag })),
      };

      try {
        await putItem(p.key, updated, version);
      } catch (e) {
        const fresh = await fetchItem(p.key);
        const freshExisting = Array.isArray(fresh.data?.tags)
          ? fresh.data.tags.map((t) => t.tag).filter(Boolean)
          : [];
        const freshMerged = uniqStrings([...freshExisting, ...themes]);
        const freshUpdated = {
          ...fresh.data,
          tags: freshMerged.map((tag) => ({ tag })),
        };
        await putItem(p.key, freshUpdated, fresh.version);
      }
    }

    res.json({
      ok: true,
      noteKey: createdNoteKey || null,
      noteUrl: createdNoteKey ? `${ZOTERO_BASE}/users/${ZOTERO_USER_ID}/items/${createdNoteKey}` : null,
      noteTags: noteTags.map((t) => t.tag),
    });
  } catch (e) {
    res.status(500).json({ error: "Export failed", details: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running: http://localhost:${PORT}`);
});
