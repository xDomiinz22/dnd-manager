import { Routes, Route, useLocation, type Location } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { HomePage } from "./pages/HomePage";
import { GroupsPage } from "./pages/GroupsPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { MyCharactersPage } from "./pages/MyCharactersPage";
import { CharacterSheetPage } from "./pages/CharacterSheetPage";
import { GroupJournalPage } from "./pages/GroupJournalPage";
import { CharacterJournalPage } from "./pages/CharacterJournalPage";
import { GroupMusicPage } from "./pages/GroupMusicPage";
import { CharacterProfileModal } from "./components/character/CharacterProfileModal";

export function App() {
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)
    ?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation ?? location}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:id" element={<GroupDetailPage />} />
            <Route path="/groups/:id/journal" element={<GroupJournalPage />} />
            <Route path="/groups/:id/journal/:pageId" element={<GroupJournalPage />} />
            <Route path="/groups/:id/music" element={<GroupMusicPage />} />
            <Route path="/characters" element={<MyCharactersPage />} />
            <Route path="/characters/:id" element={<CharacterSheetPage />} />
            <Route path="/characters/:id/journal" element={<CharacterJournalPage />} />
            <Route path="/characters/:id/journal/:pageId" element={<CharacterJournalPage />} />
          </Route>
        </Route>
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route path="/characters/:id" element={<CharacterProfileModal />} />
        </Routes>
      )}
    </>
  );
}
