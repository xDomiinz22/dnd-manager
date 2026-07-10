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
    <main className="flex min-h-screen items-center justify-center bg-parchment text-ink">
      <div className="w-full max-w-sm rounded-sm border border-rule bg-parchment-panel p-8 shadow-[inset_0_0_28px_-6px_rgba(107,22,32,0.22)]">
        <h1 className="mb-1 font-display text-2xl tracking-wide text-oxblood">Iniciar sesión</h1>
        <div className="chapter-rule mb-6" />

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

        <div className="my-5 flex items-center gap-3 text-xs text-ink-muted">
          <div className="h-px flex-1 bg-rule" />
          o
          <div className="h-px flex-1 bg-rule" />
        </div>

        <GoogleSignInButton />

        <p className="mt-4 text-center text-sm text-ink-muted">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-oxblood hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}
