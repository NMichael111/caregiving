import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../lib/auth";
import type { Role } from "../lib/types";

interface Props {
  children: ReactNode;
  requireRole?: Role;
}

export function AuthGate({ children, requireRole }: Props) {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRole) {
    const role = (session.user as unknown as { role?: Role }).role;
    if (role !== requireRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
