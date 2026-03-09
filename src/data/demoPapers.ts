export type Paper = {
  id: string;
  title: string;
  authors: string;
  year: number;
  shortLabel?: string;
  tags: string[];
};

export const demoPapers: Paper[] = [
  { id: "p1", title: "Paper 1", authors: "User 1", year: 2021, tags: [] },
  { id: "p2", title: "Paper 2", authors: "User 1", year: 2020, tags: [] },
  { id: "p3", title: "Paper 3", authors: "User 2", year: 2022, tags: [] },
  { id: "p4", title: "Paper 4", authors: "User 2", year: 2019, tags: [] },
  { id: "p5", title: "Paper 5", authors: "User 1", year: 2018, tags: [] },
  { id: "p6", title: "Paper 6", authors: "User 2", year: 2023, tags: [] },
];
