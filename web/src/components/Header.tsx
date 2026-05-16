import { useNavigate } from "react-router-dom";
import { signOut, useSession } from "../lib/auth";
import type { Role } from "../lib/types";

export function Header() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  if (!session) return null;
  const user = session.user as unknown as { name: string; role: Role };

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">Homecare</span>
          <span className="hidden sm:inline text-xs uppercase tracking-wide text-slate-400">
            {user.role === "ADMIN" ? "Admin" : "Caregiver"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-slate-600">{user.name}</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
