import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "../features/auth/hooks";
import { loadGoogleIdentityServices } from "../lib/googleIdentity";
import { toErrorMessage, useToast } from "./ui/Toast";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleSignInButtonProps {
  text?: "signin_with" | "signup_with";
}

export function GoogleSignInButton({ text = "signin_with" }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const googleLogin = useGoogleLogin();
  const [unavailable, setUnavailable] = useState(!CLIENT_ID);

  useEffect(() => {
    if (!CLIENT_ID) {
      // Falla en silencio a propósito (no rompe login/registro por
      // contraseña), pero deja rastro en consola: la causa casi siempre es
      // que falta configurar VITE_GOOGLE_CLIENT_ID en el entorno del build.
      console.warn(
        "GoogleSignInButton: falta VITE_GOOGLE_CLIENT_ID, el botón de Google no se muestra.",
      );
    }
  }, []);

  // El script de Google solo debe cargarse e inicializarse una vez; el
  // callback siempre lee la versión más reciente de navigate/toast/mutate a
  // través de este ref para no quedarse con closures obsoletas.
  const latestRef = useRef({ navigate, toast, googleLogin });
  latestRef.current = { navigate, toast, googleLogin };

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return;
    let cancelled = false;

    loadGoogleIdentityServices()
      .then((accountsId) => {
        if (cancelled || !containerRef.current) return;
        accountsId.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            const { navigate, toast, googleLogin } = latestRef.current;
            googleLogin.mutate(
              { idToken: response.credential },
              {
                onSuccess: () => navigate("/", { replace: true }),
                onError: (err) =>
                  toast.error(toErrorMessage(err, "No se pudo iniciar sesión con Google.")),
              },
            );
          },
        });
        accountsId.renderButton(containerRef.current, {
          theme: "filled_black",
          size: "large",
          width: "320",
          text,
        });
      })
      .catch(() => setUnavailable(true));

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (unavailable) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}
