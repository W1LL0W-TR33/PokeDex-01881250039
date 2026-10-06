import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout.jsx";
import ListPage from "./pages/ListPage.jsx";
import DetailPage from "./pages/DetailPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import TeamPage from "./pages/TeamPage.jsx";
import ArenaPage from "./pages/ArenaPage.jsx";
import CollectionPage from "./pages/CollectionPage.jsx";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ListPage />} />
          <Route path="/pokemon/:name" element={<DetailPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="/wild" element={<ArenaPage startWildEncounter />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;