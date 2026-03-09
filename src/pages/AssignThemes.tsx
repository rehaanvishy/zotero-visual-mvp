import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PaperMeta } from "../types";
import type { ColourName } from "../state/useMvpState";

const COLOUR_HEX: Record<ColourName, string> = {
  Red: "#EF4444",
  Blue: "#3B82F6",
  Green: "#22C55E",
  Purple: "#A855F7",
  Orange: "#F97316",
};

const MAX_THEMES = 8;

export default function AssignThemes({ mvp }: { mvp: any }) {
  const nav = useNavigate();
  const selected = mvp.selectedPapers as PaperMeta[];

  const [themeName, setThemeName] = useState("");
  const [themeColour, setThemeColour] = useState<ColourName>("Blue");
  const [pickTheme, setPickTheme] = useState<string>("");

  const themeColours = (mvp.themeColours || {}) as Record<string, ColourName>;

  const themeNames = useMemo(
    () => Object.keys(themeColours).sort((a, b) => a.localeCompare(b)),
    [themeColours]
  );

  const usedColours = useMemo(() => new Set(Object.values(themeColours)), [themeColours]);

  function normaliseThemeName(raw: string) {
    return raw.trim().replace(/\s+/g, " ");
  }

  const canCreateMoreThemes = themeNames.length < MAX_THEMES;

  function createTheme() {
    const name = normaliseThemeName(themeName);
    if (!name) return;
    if (themeColours[name]) return;
    if (!canCreateMoreThemes) return;
    if (usedColours.has(themeColour)) return;

    mvp.setThemeColour(name, themeColour);
    setThemeName("");
    setPickTheme((prev: string) => (prev ? prev : name));
  }

  function deleteTheme(name: string) {
    mvp.deleteThemeEverywhere(name);
    setPickTheme((prev: string) => (prev === name ? "" : prev));
  }

  function addExistingThemeToPaper(paperKey: string, t: string) {
    if (!t) return;
    const curr: string[] = mvp.paperConfig[paperKey]?.themes || [];
    if (curr.includes(t)) return;
    mvp.updatePaperConfig(paperKey, { themes: [...curr, t] });
  }

  function removeThemeFromPaper(paperKey: string, t: string) {
    const curr: string[] = mvp.paperConfig[paperKey]?.themes || [];
    mvp.updatePaperConfig(paperKey, { themes: curr.filter((x: string) => x !== t) });
  }

  function themeHex(theme: string) {
    const c = themeColours[theme];
    return c ? COLOUR_HEX[c] : "#ddd";
  }

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h2>Assign Themes + Colours</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <button onClick={() => nav("/select")}>Back</button>
        <button onClick={() => nav("/cluster")}>Next: Cluster</button>
      </div>

      <p style={{ opacity: 0.85 }}>
        Flow: 1) Create theme + colour, 2) Assign themes to papers. One colour per theme.
      </p>

      {/* 1) Create themes */}
      <div style={{ border: "1px dashed #bbb", borderRadius: 12, padding: 12, marginBottom: 14 }}>
        <b>1) Create themes (choose colour once)</b>

        <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            placeholder="Theme name (e.g., Peer feedback)"
            style={{ padding: 8, minWidth: 320 }}
          />

          <select
            value={themeColour}
            onChange={(e) => setThemeColour(e.target.value as ColourName)}
            style={{
              padding: 8,
              borderRadius: 8,
              border: `2px solid ${COLOUR_HEX[themeColour]}`,
            }}
          >
            {(mvp.COLOURS as ColourName[]).map((c) => (
              <option key={c} value={c} disabled={usedColours.has(c)}>
                {c}{usedColours.has(c) ? " (taken)" : ""}
              </option>
            ))}
          </select>

          <button
            onClick={createTheme}
            disabled={
              !normaliseThemeName(themeName) ||
              usedColours.has(themeColour) ||
              !canCreateMoreThemes
            }
          >
            Create theme
          </button>

          <span style={{ fontSize: 12, opacity: 0.8 }}>
            Themes: <b>{themeNames.length}</b>/{MAX_THEMES}
          </span>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {themeNames.length === 0 ? (
            <span style={{ fontSize: 12, opacity: 0.7 }}>No themes created yet.</span>
          ) : (
            themeNames.map((t) => (
              <div
                key={t}
                style={{
                  border: `2px solid ${themeHex(t)}`,
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <b>{t}</b>
                <span style={{ opacity: 0.75 }}>{themeColours[t]}</span>
                <button
                  onClick={() => deleteTheme(t)}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 999,
                    padding: "2px 8px",
                    cursor: "pointer",
                    background: "white",
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2) Pick theme */}
      <div style={{ border: "1px dashed #bbb", borderRadius: 12, padding: 12, marginBottom: 14 }}>
        <b>2) Assign existing themes to papers</b>

        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Pick theme:</span>

          <select
            value={pickTheme}
            onChange={(e) => setPickTheme(e.target.value)}
            style={{
              padding: 8,
              minWidth: 280,
              borderRadius: 8,
              border: pickTheme ? `2px solid ${themeHex(pickTheme)}` : "1px solid #ddd",
            }}
            disabled={themeNames.length === 0}
          >
            <option value="">
              {themeNames.length === 0 ? "Create a theme first..." : "Select a theme..."}
            </option>
            {themeNames.map((t) => (
              <option key={t} value={t}>
                {t} ({themeColours[t]})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Papers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        {selected.map((p) => {
          const cfg = mvp.paperConfig[p.key];
          const themes: string[] = cfg?.themes || [];

          return (
            <div key={p.key} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 650 }}>{cfg?.shortLabel || p.title}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
                {p.creators} {p.doi ? `— ${p.doi}` : ""}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={cfg?.shortLabel || ""}
                  onChange={(e) => mvp.updatePaperConfig(p.key, { shortLabel: e.target.value })}
                  placeholder="Short label (e.g., OOP Prog)"
                  style={{ padding: 8, minWidth: 240 }}
                />

                <button
                  onClick={() => addExistingThemeToPaper(p.key, pickTheme)}
                  disabled={!pickTheme}
                >
                  Add selected theme
                </button>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {themes.length === 0 ? (
                  <span style={{ fontSize: 12, opacity: 0.7 }}>No themes assigned yet.</span>
                ) : (
                  themes.map((t) => (
                    <span
                      key={t}
                      style={{
                        border: `2px solid ${themeHex(t)}`,
                        padding: "4px 8px",
                        borderRadius: 999,
                        fontSize: 12,
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onClick={() => removeThemeFromPaper(p.key, t)}
                      title="Click to remove"
                    >
                      {t} ✕
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
