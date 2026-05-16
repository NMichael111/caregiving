import { NavLink, Outlet } from "react-router-dom";
import { Header } from "./Header";
import { AuthGate } from "./AuthGate";

const navItems = [
  { to: "/admin/today", label: "Today" },
  { to: "/admin/calendar", label: "Calendar" },
  { to: "/admin/caregivers", label: "Caregivers" },
  { to: "/admin/clients", label: "Clients" },
  { to: "/admin/timesheets", label: "Timesheets" },
  { to: "/admin/messages", label: "Messages" },
];

export function AdminLayout() {
  return (
    <AuthGate requireRole="ADMIN">
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 mx-auto max-w-7xl w-full flex flex-col sm:flex-row gap-4 px-4 py-4">
          <nav className="sm:w-44 flex sm:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${
                    isActive
                      ? "bg-brand-50 text-brand-700 font-medium"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
