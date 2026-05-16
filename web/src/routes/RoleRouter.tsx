import { Navigate } from "react-router-dom";
import { useSession } from "../lib/auth";
import type { Role } from "../lib/types";

export default function RoleRouter() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  const role = (session.user as unknown as { role?: Role }).role;
  if (role === "ADMIN") return <Navigate to="/admin/today" replace />;
  return <Navigate to="/caregiver/today" replace />;
}
