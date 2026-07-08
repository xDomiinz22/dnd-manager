import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "../features/auth/hooks";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: () => navigate("/", { replace: true }) },
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-xl"
      >
        <h1 className="mb-6 text-2xl font-semibold text-amber-400">Iniciar sesión</h1>

        <label className="mb-1 block text-sm text-slate-400" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
        />

        <label className="mb-1 block text-sm text-slate-400" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-amber-400"
        />

        {login.isError && (
          <p className="mb-4 text-sm text-red-400">{(login.error as Error).message}</p>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded bg-amber-400 px-3 py-2 font-medium text-slate-950 disabled:opacity-50"
        >
          {login.isPending ? "Entrando..." : "Entrar"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-400">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-amber-400 hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </main>
  );
}
