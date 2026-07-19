import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChapterHeading } from "../components/ui/ChapterHeading";

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <ChapterHeading>Hola, {user?.username}</ChapterHeading>
      <p className="mb-6 text-ink-muted">Bienvenido a D&D Manager.</p>
      <Link
        to="/groups"
        className="inline-block rounded-sm border border-gold/60 bg-oxblood px-4 py-2 font-semibold uppercase tracking-wide text-ivory hover:bg-oxblood-dark"
      >
        Ver tus grupos
      </Link>
    </div>
  );
}
