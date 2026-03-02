import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import DarkModeToggle from "../components/DarkModeToggle";
import Sidebar from "../components/Sidebar";
import { logoutUser } from "../utils/auth";

// Shared layout for all role dashboards.
function DashboardLayout({ title, navItems, children, theme, onToggleTheme }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-4 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row">
        <Sidebar title={title} items={navItems} />

        <main className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {title}
            </h1>
            <div className="flex items-center gap-2">
              <DarkModeToggle theme={theme} onToggle={onToggleTheme} />
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-600"
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
