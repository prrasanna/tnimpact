import DashboardLayout from "../layouts/DashboardLayout";

function DeliveryRoute({ theme, onToggleTheme }) {
  const navItems = [
    { label: "Dashboard", path: "/delivery", end: true },
    { label: "My Deliveries", path: "/delivery/my-deliveries" },
    { label: "Optimized Route", path: "/delivery/route" },
    { label: "Settings", path: "/delivery/settings" },
  ];

  return (
    <DashboardLayout
      title="Optimized Route"
      navItems={navItems}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <h2 className="text-2xl font-bold text-white">Optimized Route</h2>
        <p className="mt-2 text-slate-300">
          Route optimization tools will appear here.
        </p>
      </section>
    </DashboardLayout>
  );
}

export default DeliveryRoute;
