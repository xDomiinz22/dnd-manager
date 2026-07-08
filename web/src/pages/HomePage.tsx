import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-amber-400">
        Hola, {user?.username}
      </h1>
      <p className="mb-6 text-slate-400">Bienvenido a D&D Manager.</p>
      <Link
        to="/groups"
        className="inline-block rounded bg-amber-400 px-4 py-2 font-medium text-slate-950"
      >
        Ver tus grupos
      </Link>
    </div>
  );
}
