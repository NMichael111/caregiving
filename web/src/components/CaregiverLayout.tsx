import { NavLink, Outlet } from "react-router-dom";
import { Header } from "./Header";
import { AuthGate } from "./AuthGate";

const navItems = [
  { to: "/caregiver/today", label: "Today" },
  { to: "/caregiver/upcoming", label: "Upcoming" },
  { to: "/caregiver/history", label: "History" },
  { to: "/caregiver/messages", label: "Messages" },
];

export function CaregiverLayout() {
  return (
    <AuthGate requireRole="CAREGIVER">
      <div className="min-h-screen flex flex-col pb-16 sm:pb-0">
        <Header />
        <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-4">
          <Outlet />
        </main>
        {/* Bottom tab bar (mobile-first) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 sm:hidden">
          <div className="flex justify-around">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex-1 text-center py-3 text-xs ${
                    isActive ? "text-brand-600 font-medium" : "text-slate-500"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
        {/* Top nav on desktop */}
        <nav className="hidden sm:flex justify-center gap-2 py-2 border-t border-slate-200 bg-white order-first">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-1 rounded-md text-sm ${
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
      </div>
    </AuthGate>
  );
}
