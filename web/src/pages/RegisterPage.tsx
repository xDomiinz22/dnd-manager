import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@dnd-manager/shared";
import { useRegister } from "../features/auth/hooks";
import { TextField } from "../components/ui/TextField";
import { Button } from "../components/ui/Button";
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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-xl"
      >
        <h1 className="mb-6 text-2xl font-semibold text-amber-400">Crear cuenta</h1>

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

        <p className="mt-4 text-center text-sm text-slate-400">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-amber-400 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </main>
  );
}
