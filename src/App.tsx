import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useMvpState } from "./state/useMvpState";

import SelectPapers from "./pages/SelectPapers";
import AssignThemes from "./pages/AssignThemes";
import ClusterView from "./pages/ClusterView";
import MapView from "./pages/MapView";

export default function App() {
  const mvp = useMvpState();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/select" replace />} />
        <Route path="/select" element={<SelectPapers mvp={mvp} />} />
        <Route path="/themes" element={<AssignThemes mvp={mvp} />} />
        <Route path="/cluster" element={<ClusterView mvp={mvp} />} />
        <Route path="/map" element={<MapView mvp={mvp} />} />
      </Routes>
    </BrowserRouter>
  );
}
