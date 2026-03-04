import { NavLink } from "react-router-dom";

function Sidebar({ title, items }) {
  return (
    <aside className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm lg:w-64">
      <h2 className="mb-4 text-3xl font-bold text-white">{title}</h2>
      <nav className="space-y-2">
        {items.map((item, index) => (
          <NavLink
            key={`${item.path}-${index}`}
            to={item.path}
            className={({ isActive }) =>
              `block rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-emerald-500 text-white"
                  : "text-slate-300 hover:bg-slate-800"
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