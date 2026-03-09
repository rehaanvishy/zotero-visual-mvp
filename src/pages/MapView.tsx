import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { LinkType, ManualLink, PaperMeta } from "../types";
import type { ColourName } from "../state/useMvpState";

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { toPng } from "html-to-image";

/* ---------------- Colours ---------------- */

const COLOUR_HEX: Record<ColourName, string> = {
  Red: "#EF4444",
  Blue: "#3B82F6",
  Green: "#22C55E",
  Purple: "#A855F7",
  Orange: "#F97316",
};

const COLOUR_KEYS = Object.keys(COLOUR_HEX) as ColourName[];

function asColourName(x: unknown, fallback: ColourName = "Green"): ColourName {
  return COLOUR_KEYS.includes(x as ColourName) ? (x as ColourName) : fallback;
}

/* ---------------- Helpers ---------------- */

function overlapThemes(a: string[], b: string[]) {
  const s = new Set(a);
  return b.filter((x) => s.has(x));
}

function uniqStrings(xs: string[]) {
  return Array.from(new Set(xs.map((x) => String(x || "").trim()).filter(Boolean)));
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ---------------- Node UI ---------------- */

const PaperNode = ({ data }: NodeProps<any>) => {
  const { title, themes, themeColourHex } = data;

  return (
    <div
      style={{
        width: 260,
        background: "#1f1f1f",
        borderRadius: 14,
        padding: 12,
        color: "#eee",
        border: "1px solid #333",
        position: "relative",
        zIndex: 2,
      }}
    >
      {/* ===== TARGET HANDLES (incoming) ===== */}
      <Handle
        id="t-l"
        type="target"
        position={Position.Left}
        style={{ opacity: 0, width: 1, height: 1, top: "30%" }}
        isConnectable={false}
      />
      <Handle
        id="t-l2"
        type="target"
        position={Position.Left}
        style={{ opacity: 0, width: 1, height: 1, top: "70%" }}
        isConnectable={false}
      />
      <Handle
        id="t-t"
        type="target"
        position={Position.Top}
        style={{ opacity: 0, width: 1, height: 1, left: "50%" }}
        isConnectable={false}
      />
      <Handle
        id="t-b"
        type="target"
        position={Position.Bottom}
        style={{ opacity: 0, width: 1, height: 1, left: "50%" }}
        isConnectable={false}
      />

      {/* ===== SOURCE HANDLES (outgoing) ===== */}
      <Handle
        id="s-r"
        type="source"
        position={Position.Right}
        style={{ opacity: 0, width: 1, height: 1, top: "30%" }}
        isConnectable={false}
      />
      <Handle
        id="s-r2"
        type="source"
        position={Position.Right}
        style={{ opacity: 0, width: 1, height: 1, top: "70%" }}
        isConnectable={false}
      />
      <Handle
        id="s-t"
        type="source"
        position={Position.Top}
        style={{ opacity: 0, width: 1, height: 1, left: "50%" }}
        isConnectable={false}
      />
      <Handle
        id="s-b"
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, width: 1, height: 1, left: "50%" }}
        isConnectable={false}
      />

      <div style={{ fontWeight: 700 }}>{title}</div>

      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {themes.length === 0 && (
          <span style={{ fontSize: 12, opacity: 0.6 }}>No themes</span>
        )}

        {themes.slice(0, 2).map((t: string) => (
          <span
            key={t}
            style={{
              border: `2px solid ${themeColourHex[t] || "#888"}`,
              padding: "2px 8px",
              borderRadius: 999,
              fontSize: 11,
            }}
          >
            {t}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 8, fontSize: 11, opacity: 0.5 }}>Drag me anywhere</div>
    </div>
  );
};

/* ======================================================= */

export default function MapView({ mvp }: { mvp: any }) {
  const nav = useNavigate();
  const selected = mvp.selectedPapers as PaperMeta[];

  const themeColours = (mvp.themeColours || {}) as Record<string, ColourName>;

  const themeColourHex = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [t, c] of Object.entries(themeColours)) {
      map[t] = COLOUR_HEX[asColourName(c, "Green")];
    }
    return map;
  }, [themeColours]);

  /* ---------- Manual link form ---------- */

  const [fromKey, setFromKey] = useState("");
  const [toKey, setToKey] = useState("");
  const [type, setType] = useState<LinkType>("Theme");
  const [note, setNote] = useState("");
  const [manualColour, setManualColour] = useState<ColourName>("Blue");

  function labelForPaper(key: string) {
    const p = selected.find((x) => x.key === key);
    return mvp.paperConfig[key]?.shortLabel || p?.title || key;
  }

  function addLink() {
    if (!fromKey || !toKey || fromKey === toKey) return;

    mvp.addManualLink({
      fromKey,
      toKey,
      type,
      note: note.trim() || undefined,
      colour: manualColour,
    });

    setNote("");
  }

  /* ---------------- Auto Links ---------------- */

  const autoLinks = useMemo(() => {
    const out: { a: string; b: string; themes: string[] }[] = [];

    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        const a = selected[i].key;
        const b = selected[j].key;

        const ta = mvp.paperConfig[a]?.themes || [];
        const tb = mvp.paperConfig[b]?.themes || [];

        const common = overlapThemes(ta, tb);
        if (common.length) out.push({ a, b, themes: common });
      }
    }
    return out;
  }, [selected, mvp.paperConfig]);

  /* ---------------- ReactFlow State ---------------- */

  const nodeTypes: NodeTypes = { paper: PaperNode };

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  /* Build Nodes */

  useEffect(() => {
    const built: Node[] = selected.map((p, i) => ({
      id: p.key,
      type: "paper",
      position: { x: 100 + (i % 3) * 320, y: 80 + Math.floor(i / 3) * 220 },
      data: {
        title: labelForPaper(p.key),
        themes: mvp.paperConfig[p.key]?.themes || [],
        themeColourHex,
      },
    }));

    setNodes(built);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, mvp.paperConfig, themeColourHex]);

  /* Build Edges (✅ multi-handle routing + avoid overlap + smoother paths) */

  useEffect(() => {
    const out: Edge[] = [];

    // counts per node so multiple links don't use the same side/handle
    const sourceCount = new Map<string, number>();
    const targetCount = new Map<string, number>();

    // rotate across these so multiple edges leave/enter from different places
    const sourceHandles = ["s-r", "s-r2", "s-b", "s-t"] as const;
    const targetHandles = ["t-l", "t-l2", "t-t", "t-b"] as const;

    function nextSourceHandle(nodeId: string) {
      const n = sourceCount.get(nodeId) ?? 0;
      sourceCount.set(nodeId, n + 1);
      return sourceHandles[n % sourceHandles.length];
    }

    function nextTargetHandle(nodeId: string) {
      const n = targetCount.get(nodeId) ?? 0;
      targetCount.set(nodeId, n + 1);
      return targetHandles[n % targetHandles.length];
    }

    // auto edges (solid)
    for (const l of autoLinks) {
      const stroke = themeColourHex[l.themes[0]] || "#888";
      const label = l.themes.slice(0, 3).join(", ") + (l.themes.length > 3 ? "…" : "");

      out.push({
        id: `auto-${l.a}-${l.b}`,
        source: l.a,
        target: l.b,
        sourceHandle: nextSourceHandle(l.a),
        targetHandle: nextTargetHandle(l.b),

        // smoother routing so it doesn't curl under nodes as much
        type: "smoothstep",
        pathOptions: { offset: 40, borderRadius: 14 },

        label,
        style: { stroke, strokeWidth: 2, zIndex: 9999 },
        labelStyle: { fill: "#E5E7EB", fontSize: 12 },
        labelBgStyle: { fill: "rgba(0,0,0,0.6)" },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 6,
      });
    }

    // manual edges (dashed + animated)
    for (const l of mvp.manualLinks as ManualLink[]) {
      const stroke = COLOUR_HEX[asColourName((l as any).colour, "Green")];
      const label = l.note ? `${l.type}: ${l.note}` : l.type;

      out.push({
        id: `manual-${l.id}`,
        source: l.fromKey,
        target: l.toKey,
        sourceHandle: nextSourceHandle(l.fromKey),
        targetHandle: nextTargetHandle(l.toKey),

        type: "smoothstep",
        pathOptions: { offset: 50, borderRadius: 16 },

        label,
        animated: true,
        style: { stroke, strokeWidth: 2, strokeDasharray: "6 6", zIndex: 9999 },
        labelStyle: { fill: "#E5E7EB", fontSize: 12 },
        labelBgStyle: { fill: "rgba(0,0,0,0.6)" },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 6,
      });
    }

    setEdges(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLinks, mvp.manualLinks, themeColourHex]);

  /* ---------------- Export to Zotero ---------------- */

  const [exportStatus, setExportStatus] = useState<string>("");

  async function exportToZotero() {
    try {
      setExportStatus("Exporting…");

      const papersPayload = selected.map((p) => {
        const themes = mvp.paperConfig[p.key]?.themes || [];
        const existingTags = uniqStrings((p as any).tags || []);
        return {
          key: p.key,
          title: labelForPaper(p.key),
          themes: uniqStrings(themes),
          existingTags,
        };
      });

      const autoLinksPayload = autoLinks.map((l) => ({
        theme: l.themes[0],
        fromKey: l.a,
        toKey: l.b,
        fromTitle: labelForPaper(l.a),
        toTitle: labelForPaper(l.b),
      }));

      const manualLinksPayload = (mvp.manualLinks as ManualLink[]).map((l) => ({
        fromKey: l.fromKey,
        toKey: l.toKey,
        fromTitle: labelForPaper(l.fromKey),
        toTitle: labelForPaper(l.toKey),
        type: l.type,
        note: l.note || undefined,
      }));

      const body = {
        title: "Map View Export — Proxy Note",
        papers: papersPayload,
        autoLinks: autoLinksPayload,
        manualLinks: manualLinksPayload,
      };

      const r = await fetch("http://localhost:3001/api/zotero/export-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const text = await r.text();
        throw new Error(text);
      }

      setExportStatus("Exported ✅ (note created + tags applied)");
    } catch (e: any) {
      setExportStatus(`Export failed ❌ ${e?.message || String(e)}`);
    }
  }

  /* ---------------- Download Map View PNG ---------------- */

  const [downloadStatus, setDownloadStatus] = useState<string>("");

  async function downloadMapView() {
    try {
      setDownloadStatus("Preparing map image…");

      const viewport = document.querySelector(".react-flow__viewport") as HTMLElement | null;
      if (!viewport) {
        throw new Error("Could not find Map View to capture.");
      }

      const dataUrl = await toPng(viewport, {
        backgroundColor: "#0b0b0b",
        pixelRatio: 2,
        cacheBust: true,
      });

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadDataUrl(dataUrl, `MapView_${stamp}.png`);

      setDownloadStatus("Map image downloaded ✅");
    } catch (e: any) {
      setDownloadStatus(`Download failed ❌ ${e?.message || String(e)}`);
    }
  }

  /* ======================================================= */

  return (
    <div style={{ padding: 20, maxWidth: 1500, margin: "0 auto" }}>
      <h2>Map View (Manual + Auto Connections)</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <button onClick={() => nav("/cluster")}>Back</button>
        <button onClick={() => nav("/themes")}>Edit themes</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 14 }}>
        <div
          style={{
            height: "84vh",
            minHeight: 900,
            border: "1px solid #333",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodesDraggable
            fitView
            fitViewOptions={{ padding: 0.25 }}
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 15, padding: 15 }}>
          <b>Add manual linkage</b>

          <label style={{ display: "block", marginTop: 10 }}>
            Paper A
            <select
              value={fromKey}
              onChange={(e) => setFromKey(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            >
              <option value="">Select...</option>
              {selected.map((p) => (
                <option key={p.key} value={p.key}>
                  {labelForPaper(p.key)}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            Paper B
            <select
              value={toKey}
              onChange={(e) => setToKey(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            >
              <option value="">Select...</option>
              {selected.map((p) => (
                <option key={p.key} value={p.key}>
                  {labelForPaper(p.key)}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            Link type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LinkType)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            >
              <option value="Theme">Theme</option>
              <option value="Method">Method</option>
              <option value="Temporal">Temporal</option>
              <option value="Custom">Custom</option>
            </select>
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            Colour
            <select
              value={manualColour}
              onChange={(e) => setManualColour(e.target.value as ColourName)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            >
              {COLOUR_KEYS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            style={{ width: "100%", padding: 8, marginTop: 10 }}
          />

          <button onClick={addLink} style={{ marginTop: 10, width: "100%" }}>
            Add link
          </button>

          <hr style={{ margin: "14px 0" }} />

          <b>Manual links</b>

          {(mvp.manualLinks as ManualLink[]).length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>None yet.</div>
          )}

          {(mvp.manualLinks as ManualLink[]).map((l) => {
            const colour = COLOUR_HEX[asColourName((l as any).colour, "Green")];

            return (
              <div
                key={l.id}
                style={{
                  borderLeft: `4px solid ${colour}`,
                  paddingLeft: 8,
                  marginTop: 10,
                  fontSize: 12,
                  lineHeight: 1.35,
                }}
              >
                <div>
                  {labelForPaper(l.fromKey)} → {labelForPaper(l.toKey)}{" "}
                  <span style={{ opacity: 0.75 }}>({l.type})</span>
                </div>

                {l.note && (
                  <div style={{ marginTop: 4, opacity: 0.85 }}>
                    <i>{l.note}</i>
                  </div>
                )}

                <button style={{ marginTop: 6 }} onClick={() => mvp.deleteManualLink(l.id)}>
                  Delete
                </button>
              </div>
            );
          })}

          <hr style={{ margin: "14px 0" }} />

          <b>Legend</b>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8, lineHeight: 1.4 }}>
            • Solid = auto (theme overlap) <br />
            • Dashed + animated = manual <br />
            • Drag nodes freely
          </div>

          <hr style={{ margin: "14px 0" }} />

          <b>Export</b>
          <button style={{ marginTop: 8, width: "100%" }} onClick={exportToZotero}>
            Export selection to Zotero
          </button>

          <button style={{ marginTop: 8, width: "100%" }} onClick={downloadMapView}>
            Download Map View
          </button>

          {exportStatus && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>{exportStatus}</div>
          )}

          {downloadStatus && (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>{downloadStatus}</div>
          )}
        </div>
      </div>
    </div>
  );
}