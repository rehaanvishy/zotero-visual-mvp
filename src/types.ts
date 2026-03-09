export type ZoteroItem = {
  key: string;
  itemType: string;
  title: string;
  creators: string;
  date: string;
  publicationTitle: string;
  doi: string;
  url: string;
  tags: string[];
};

export type LinkType = "Theme" | "Method" | "Temporal" | "Custom";

export type ManualLink = {
  colour: string;
  id: string;
  fromKey: string;
  toKey: string;
  type: LinkType;
  note?: string;
};

export type PaperMeta = ZoteroItem;

export type PaperConfig = {
  shortLabel: string;
  colour: string;     // one of fixed palette
  themes: string[];   // max 8 unique in whole project
};
