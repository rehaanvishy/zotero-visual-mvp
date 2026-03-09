import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { PaperMeta } from "../types";
import type { ColourName } from "../state/useMvpState";

export default function ClusterView({ mvp }: { mvp: any }) {
  const nav = useNavigate();
  const selected = mvp.selectedPapers as PaperMeta[];

  const COLOUR_HEX: Record<ColourName, string> = {
    Red: "#EF4444",
    Blue: "#3B82F6",
    Green: "#22C55E",
    Purple: "#A855F7",
    Orange: "#F97316",
  };

  const themeColours = (mvp.themeColours || {}) as Record<string, ColourName>;

  const themeColourHex = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [theme, colourName] of Object.entries(themeColours)) {
      map[theme] = COLOUR_HEX[colourName];
    }
    return map; // theme -> hex
  }, [themeColours]);

  const clusters = useMemo(() => {
    const byTheme: Record<string, PaperMeta[]> = {};
    const multi: PaperMeta[] = [];

    for (const p of selected) {
      const themes: string[] = mvp.paperConfig[p.key]?.themes || [];
      if (themes.length >= 2) multi.push(p);

      for (const t of themes) {
        byTheme[t] = byTheme[t] || [];
        byTheme[t].push(p);
      }
    }

    return { byTheme, multi };
  }, [selected, mvp.paperConfig]);

  function borderForTheme(theme: string) {
    const hex = themeColourHex[theme] || "#bbb";
    return `2px dashed ${hex}`;
  }

  function paperCardBorderForTheme(theme: string) {
    const hex = themeColourHex[theme] || "#ddd";
    return `2px solid ${hex}`;
  }

  function multiBarStyle(paperKey: string): React.CSSProperties {
    const themes: string[] = mvp.paperConfig[paperKey]?.themes || [];
    const hexes = themes.map((t: string) => themeColourHex[t]).filter(Boolean);

    const unique = Array.from(new Set(hexes));
    if (unique.length === 0) return { width: 6, borderRadius: 8, background: "#bbb" };
    if (unique.length === 1) return { width: 6, borderRadius: 8, background: unique[0] };

    return {
      width: 6,
      borderRadius: 8,
      background: `linear-gradient(to bottom, ${unique.join(", ")})`,
    };
  }

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h2>Cluster View</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <button onClick={() => nav("/themes")}>Back</button>
        <button onClick={() => nav("/map")}>Next: Map</button>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {/* Multi-theme section */}
        <div style={{ border: "1px dashed #bbb", padding: 12, borderRadius: 12 }}>
          <b>Multi-theme papers</b>{" "}
          <span style={{ opacity: 0.7 }}>({clusters.multi.length})</span>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {clusters.multi.map((p) => {
              const themes: string[] = mvp.paperConfig[p.key]?.themes || [];
              return (
                <div
                  key={p.key}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    padding: 10,
                    display: "flex",
                    gap: 10,
                    alignItems: "stretch",
                  }}
                >
                  <div style={multiBarStyle(p.key)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>
                      {mvp.paperConfig[p.key]?.shortLabel || p.title}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Themes: {themes.join(", ")}
                    </div>
                  </div>
                </div>
              );
            })}

            {clusters.multi.length === 0 && (
              <div style={{ fontSize: 12, opacity: 0.7 }}>None.</div>
            )}
          </div>
        </div>

        {/* Theme groups */}
        {Object.entries(clusters.byTheme).map(([theme, papers]) => (
          <div key={theme} style={{ border: borderForTheme(theme), padding: 12, borderRadius: 12 }}>
            <b>{theme}</b> <span style={{ opacity: 0.7 }}>({papers.length})</span>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {papers.map((p) => (
                <div
                  key={p.key}
                  style={{
                    border: paperCardBorderForTheme(theme),
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {mvp.paperConfig[p.key]?.shortLabel || p.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
