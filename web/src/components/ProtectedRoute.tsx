import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Skeleton } from "./ui/Skeleton";

export function ProtectedRoute() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-slate-950"
        role="status"
        aria-label="Cargando sesión"
      >
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
