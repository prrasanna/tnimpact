import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import DarkModeToggle from "../components/DarkModeToggle";
import Sidebar from "../components/Sidebar";
import { getCurrentUser, logoutUser } from "../utils/auth";

// Shared layout for all role dashboards.
function DashboardLayout({ title, navItems, children, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const fullName = currentUser?.name || "User";
  const roleName = currentUser?.role || "User";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logoutUser();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 px-3 py-3 md:px-4 md:py-4">
      <div className="flex w-full flex-col gap-3 lg:flex-row">
        <Sidebar title={title} items={navItems} />

        <main className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-4xl font-bold text-white">{title}</h1>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {initials || "U"}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-slate-100">{fullName}</p>
                  <p className="text-xs text-slate-400">{roleName}</p>
                </div>
              </div>

              <DarkModeToggle theme={theme} onToggle={onToggleTheme} />
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
