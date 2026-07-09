import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@dnd-manager/shared";
import { useLogin } from "../features/auth/hooks";
import { TextField } from "../components/ui/TextField";
import { Button } from "../components/ui/Button";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { toErrorMessage, useToast } from "../components/ui/Toast";

export function LoginPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  function onSubmit(values: LoginInput) {
    login.mutate(values, {
      onSuccess: () => navigate("/", { replace: true }),
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo iniciar sesión.")),
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="mb-6 text-2xl font-semibold text-amber-400">Iniciar sesión</h1>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <TextField
            label="Contraseña"
            type="password"
            error={errors.password?.message}
            {...register("password")}
          />

          <Button
            type="submit"
            isLoading={login.isPending}
            loadingText="Entrando..."
            className="w-full"
          >
            Entrar
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-slate-800" />
          o
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <GoogleSignInButton />

        <p className="mt-4 text-center text-sm text-slate-400">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-amber-400 hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}
