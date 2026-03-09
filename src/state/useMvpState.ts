// src/state/useMvpState.ts
import { useMemo, useState } from "react";
import type { ManualLink, PaperConfig, PaperMeta } from "../types";
import { exportMapNoteToZotero } from "../api";

const COLOURS = ["Red", "Blue", "Green", "Purple", "Orange"] as const;
export type ColourName = (typeof COLOURS)[number];

function overlapThemes(a: string[], b: string[]) {
  const s = new Set(a);
  return b.filter((x) => s.has(x));
}

export function useMvpState() {
  const [libraryItems, setLibraryItems] = useState<PaperMeta[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]); // max 5
  const [paperConfig, setPaperConfig] = useState<Record<string, PaperConfig>>({});
  const [manualLinks, setManualLinks] = useState<ManualLink[]>([]);

  const [themeColours, setThemeColours] = useState<Record<string, ColourName>>({});

  const selectedPapers = useMemo(
    () => libraryItems.filter((p) => selectedKeys.includes(p.key)),
    [libraryItems, selectedKeys]
  );

  const allThemes = useMemo(() => {
    const s = new Set<string>();
    for (const key of selectedKeys) {
      const cfg = paperConfig[key];
      (cfg?.themes || []).forEach((t) => s.add(t));
    }
    return Array.from(s);
  }, [selectedKeys, paperConfig]);

  function toggleSelect(key: string) {
    setSelectedKeys((prev) => {
      const isSelected = prev.includes(key);
      if (isSelected) return prev.filter((k) => k !== key);
      if (prev.length >= 5) return prev;
      return [...prev, key];
    });

    setPaperConfig((prev) => {
      if (prev[key]) return prev;
      return {
        ...prev,
        [key]: {
          shortLabel: "",
          colour: "Blue",
          themes: [],
        },
      };
    });
  }

  function updatePaperConfig(key: string, patch: Partial<PaperConfig>) {
    setPaperConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }

  function setThemeColour(theme: string, colour: ColourName) {
    const name = theme.trim().replace(/\s+/g, " ");
    if (!name) return;

    setThemeColours((prev) => {
      const colourTakenBy = Object.entries(prev).find(
        ([t, c]) => c === colour && t !== name
      );
      if (colourTakenBy) return prev;
      return { ...prev, [name]: colour };
    });
  }

  function deleteThemeEverywhere(theme: string) {
    const name = theme.trim().replace(/\s+/g, " ");
    if (!name) return;

    setThemeColours((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });

    setPaperConfig((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const cfg = next[key];
        const themes = cfg?.themes || [];
        if (themes.includes(name)) {
          next[key] = { ...cfg, themes: themes.filter((t) => t !== name) };
        }
      }
      return next;
    });
  }

  function addManualLink(link: Omit<ManualLink, "id">) {
    const id = `${link.fromKey}_${link.toKey}_${link.type}_${Date.now()}`;
    setManualLinks((prev) => [...prev, { ...link, id }]);
  }

  function deleteManualLink(id: string) {
    setManualLinks((prev) => prev.filter((l) => l.id !== id));
  }

  /* ✅ NEW: build the note text (your proxy-note style) */
  function buildExportNoteText() {
    const lines: string[] = [];
    lines.push("MAP VIEW EXPORT — PROXY NOTE");
    lines.push("========================================");
    lines.push("");
    lines.push("----------------------------------------");
    lines.push("PAPERS");
    lines.push("----------------------------------------");

    selectedPapers.forEach((p, idx) => {
      const title = paperConfig[p.key]?.shortLabel?.trim() || p.title || p.key;
      const themes = paperConfig[p.key]?.themes || [];
      lines.push(`${idx + 1}. ${title}`);
      lines.push(`   Tags: ${themes.length ? themes.join(", ") : "None"}`);
    });

    // auto links (theme overlap)
    const autoByTheme = new Map<string, { a: string; b: string }[]>();
    for (let i = 0; i < selectedPapers.length; i++) {
      for (let j = i + 1; j < selectedPapers.length; j++) {
        const a = selectedPapers[i].key;
        const b = selectedPapers[j].key;
        const ta = paperConfig[a]?.themes || [];
        const tb = paperConfig[b]?.themes || [];
        const common = overlapThemes(ta, tb);
        for (const t of common) {
          const arr = autoByTheme.get(t) || [];
          arr.push({ a, b });
          autoByTheme.set(t, arr);
        }
      }
    }

    lines.push("");
    lines.push("----------------------------------------");
    lines.push("AUTO LINKS (Theme Overlap)");
    lines.push("----------------------------------------");

    if (autoByTheme.size === 0) {
      lines.push("None");
    } else {
      for (const [theme, pairs] of autoByTheme.entries()) {
        lines.push(`${theme}:`);
        for (const pair of pairs) {
          const aTitle =
            paperConfig[pair.a]?.shortLabel?.trim() ||
            selectedPapers.find((x) => x.key === pair.a)?.title ||
            pair.a;
          const bTitle =
            paperConfig[pair.b]?.shortLabel?.trim() ||
            selectedPapers.find((x) => x.key === pair.b)?.title ||
            pair.b;
          lines.push(`${aTitle} → ${bTitle}`);
        }
        lines.push("");
      }
    }

    lines.push("----------------------------------------");
    lines.push("MANUAL LINKS");
    lines.push("----------------------------------------");

    if (manualLinks.length === 0) {
      lines.push("None");
    } else {
      for (const l of manualLinks) {
        const aTitle =
          paperConfig[l.fromKey]?.shortLabel?.trim() ||
          selectedPapers.find((x) => x.key === l.fromKey)?.title ||
          l.fromKey;
        const bTitle =
          paperConfig[l.toKey]?.shortLabel?.trim() ||
          selectedPapers.find((x) => x.key === l.toKey)?.title ||
          l.toKey;

        lines.push(`${aTitle} → ${bTitle}`);
        lines.push(`Type: ${l.type}`);
        if (l.note) lines.push(`Note: ${l.note}`);
        lines.push("");
      }
    }

    lines.push("----------------------------------------");
    lines.push("RELATED (Auto-populated in Zotero)");
    lines.push("----------------------------------------");
    selectedPapers.forEach((p) => {
      const title = paperConfig[p.key]?.shortLabel?.trim() || p.title || p.key;
      lines.push(`• ${title}`);
    });

    lines.push("");
    lines.push("========================================");
    lines.push("END MAP VIEW EXPORT");
    lines.push("========================================");

    return lines.join("\n");
  }

  /* ✅ NEW: call backend -> Zotero API (creates note + tags + relations) */
  async function exportSelectionToZotero() {
    const noteTitle = `Map View Export — ${new Date().toLocaleString()}`;

    const itemKeys = selectedPapers.map((p) => p.key);

    // key -> theme tags
    const itemTags: Record<string, string[]> = {};
    for (const p of selectedPapers) {
      itemTags[p.key] = paperConfig[p.key]?.themes || [];
    }

    const noteContent = buildExportNoteText();

    // backend does:
    // 1) create standalone note with noteContent
    // 2) add all itemKeys to Related for the note
    // 3) attach tags to each item (themes)
    // 4) preserve manual links + notes inside noteContent (already included)
    return exportMapNoteToZotero({
      noteTitle,
      noteContent,
      itemKeys,
      itemTags,
    });
  }

  return {
    COLOURS,
    libraryItems,
    setLibraryItems,
    selectedKeys,
    toggleSelect,
    selectedPapers,
    paperConfig,
    updatePaperConfig,
    allThemes,
    manualLinks,
    addManualLink,
    deleteManualLink,
    themeColours,
    setThemeColour,
    deleteThemeEverywhere,

    // ✅ NEW
    buildExportNoteText,
    exportSelectionToZotero,
  };
}