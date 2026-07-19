import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@dnd-manager/shared";
import { useRegister } from "../features/auth/hooks";
import { TextField } from "../components/ui/TextField";
import { Button } from "../components/ui/Button";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { toErrorMessage, useToast } from "../components/ui/Toast";

export function RegisterPage() {
  const register = useRegister();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  function onSubmit(values: RegisterInput) {
    register.mutate(values, {
      onSuccess: () => navigate("/", { replace: true }),
      onError: (err) => toast.error(toErrorMessage(err, "No se pudo crear la cuenta.")),
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment text-ink">
      <div className="w-full max-w-sm rounded-sm border border-rule bg-parchment-panel p-8 shadow-[inset_0_0_28px_-6px_rgb(from_var(--color-oxblood)_r_g_b/0.22)]">
        <h1 className="mb-1 font-display text-2xl tracking-wide text-oxblood">Crear cuenta</h1>
        <div className="chapter-rule mb-6" />

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            label="Email"
            type="email"
            error={errors.email?.message}
            {...registerField("email")}
          />
          <TextField
            label="Username"
            type="text"
            error={errors.username?.message}
            {...registerField("username")}
          />
          <TextField
            label="Contraseña"
            type="password"
            error={errors.password?.message}
            {...registerField("password")}
          />

          <Button
            type="submit"
            isLoading={register.isPending}
            loadingText="Creando..."
            className="w-full"
          >
            Crear cuenta
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-muted">
          <div className="h-px flex-1 bg-rule" />
          o
          <div className="h-px flex-1 bg-rule" />
        </div>

        <GoogleSignInButton text="signup_with" />

        <p className="mt-4 text-center text-sm text-ink-muted">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-oxblood hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
