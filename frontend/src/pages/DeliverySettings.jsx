import DashboardLayout from "../layouts/DashboardLayout";

function DeliverySettings({ theme, onToggleTheme }) {
  const navItems = [
    { label: "Dashboard", path: "/delivery", end: true },
    { label: "My Deliveries", path: "/delivery/my-deliveries" },
    { label: "Optimized Route", path: "/delivery/route" },
    { label: "Settings", path: "/delivery/settings" },
  ];

  return (
    <DashboardLayout
      title="Delivery Settings"
      navItems={navItems}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="mt-2 text-slate-300">
          Delivery preferences and account controls will appear here.
        </p>
      </section>
    </DashboardLayout>
  );
}

export default DeliverySettings;
