import { NavLink } from "react-router-dom";

// Sidebar used by role-based dashboards.
function Sidebar({ title, items }) {
  return (
    <aside className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:w-64">
      <h2 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">
        {title}
      </h2>
      <nav className="space-y-2">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-emerald-500 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
