# Research Space

A visual layer for cross-reference analysis in academic literature, built on top of Zotero.

Research Space allows researchers to import papers from their live Zotero library, assign colour-coded themes, and explore relationships between papers through an interactive node-based graph. Sessions are exported as structured proxy notes written back to Zotero.

Built as part of an M.Sc. dissertation project at Trinity College Dublin.

---

## Features

- Import papers directly from your Zotero library via the Zotero Web API
- Assign up to 5 colour-coded themes per session
- Cluster View — group papers visually by assigned theme
- Map View — interactive node graph with automatic theme-overlap edges and user-defined typed manual links (Theme, Method, Temporal, Custom)
- Export session as a structured proxy note back to Zotero, with theme tags applied to each paper

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, ReactFlow, React Router v6
- **Backend:** Node.js, Express
- **API Integration:** Zotero Web API (v3)

---

## Prerequisites

- Node.js (v18 or above)
- A Zotero account with at least one item in your library
- Your Zotero User ID and API Key (obtainable from [zotero.org/settings/keys](https://www.zotero.org/settings/keys))

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/rehaanvishy/zotero-visual-mvp.git
cd zotero-visual-mvp
```

### 2. Configure environment variables

Create a `.env` file inside the `server/` directory:

```
ZOTERO_USER_ID=your_zotero_user_id
ZOTERO_API_KEY=your_zotero_api_key
```

### 3. Install dependencies

Install frontend dependencies from the project root:

```bash
npm install
```

Install backend dependencies:

```bash
cd server
npm install
cd ..
```

### 4. Run the application

You need two terminals running simultaneously.

**Terminal 1 — Start the backend (port 3001):**

```bash
cd server
node server.js
```

**Terminal 2 — Start the frontend (port 5173):**

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Usage

1. **Select Papers** — Import papers from your Zotero library and select up to 5 for the session
2. **Assign Themes** — Create named, colour-coded themes and assign them to papers
3. **Cluster View** — Review papers grouped by theme before moving to the graph
4. **Map View** — Explore automatic theme-overlap connections and create your own typed manual links
5. **Export** — Write the session back to Zotero as a proxy note with theme tags applied

---

## Project Structure

```
zotero-visual-mvp/
├── server/
│   ├── server.js        # Express backend, Zotero proxy endpoints
│   ├── index.js         # Export and note construction logic
│   └── .env             # Zotero credentials (not committed)
└── src/
    ├── pages/           # SelectPapers, AssignThemes, ClusterView, MapView
    ├── state/           # useMvpState.ts — central state hook
    ├── api.ts           # Frontend API client
    └── types.ts         # Shared TypeScript types
```

---

## Limitations

- Sessions are not persisted between browser reloads unless exported to Zotero first
- Maximum of 5 papers and 5 themes per session
- Requires local setup — no hosted version is currently available
- Exported proxy notes cannot be reimported to restore a previous session state

---

## Author

Rehaan Viswanathan — M.Sc. Integrated Computer Science, Trinity College Dublin
