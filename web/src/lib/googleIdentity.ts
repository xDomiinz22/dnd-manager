export interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, string>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client?hl=es";

let loadPromise: Promise<GoogleAccountsId> | null = null;

/** Carga el script de Google Identity Services una sola vez, aunque se monten varios botones. */
export function loadGoogleIdentityServices(): Promise<GoogleAccountsId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.accounts?.id) resolve(window.google.accounts.id);
        else reject(new Error("Google Identity Services no se inicializó correctamente"));
      };
      script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services"));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}
