import { ClipboardList, Clock3, CircleCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import VoicePanel from "../components/VoicePanel";
import { deliveryList, deliveryStats } from "../data/mockData";
import { getCurrentUser } from "../utils/auth";
import { processDeliveryVoiceCommand } from "../utils/voiceCommands";

// Delivery dashboard with status tracking and fake voice panel.
function DeliveryDashboard({ theme, onToggleTheme }) {
  const currentUser = getCurrentUser();
  const deliveryTemplateByOrderId = useMemo(
    () =>
      deliveryList.reduce((accumulator, delivery) => {
        accumulator[delivery.orderId] = delivery;
        return accumulator;
      }, {}),
    [],
  );

  const getDeliveryStorageKey = (email) =>
    `vla_delivery_data_${(email || "guest").toLowerCase()}`;

  const createInitialDeliveries = () =>
    deliveryList.map((delivery) => ({ ...delivery }));

  const normalizeDeliveries = (items) =>
    items.map((delivery) => {
      const template = deliveryTemplateByOrderId[delivery.orderId] || {};
      return { ...template, ...delivery };
    });

  const navItems = [
    { label: "Dashboard", path: "/delivery" },
    { label: "My Deliveries", path: "/delivery" },
    { label: "Optimized Route", path: "/delivery" },
    { label: "Settings", path: "/delivery" },
  ];

  const [deliveries, setDeliveries] = useState(() => {
    const storageKey = getDeliveryStorageKey(currentUser?.email);
    const savedDeliveries = localStorage.getItem(storageKey);

    if (!savedDeliveries) {
      return createInitialDeliveries();
    }

    try {
      const parsed = JSON.parse(savedDeliveries);
      return Array.isArray(parsed)
        ? normalizeDeliveries(parsed)
        : createInitialDeliveries();
    } catch {
      return createInitialDeliveries();
    }
  });

  useEffect(() => {
    const storageKey = getDeliveryStorageKey(currentUser?.email);
    localStorage.setItem(storageKey, JSON.stringify(deliveries));
  }, [currentUser?.email, deliveries]);

  const dynamicStats = useMemo(() => {
    const completed = deliveries.filter(
      (delivery) => delivery.status === "Completed",
    ).length;
    const pending = deliveries.filter(
      (delivery) => delivery.status === "Pending",
    ).length;

    return [
      { ...deliveryStats[0], value: deliveries.length },
      { ...deliveryStats[1], value: completed },
      { ...deliveryStats[2], value: pending },
    ];
  }, [deliveries]);

  const markAsDelivered = (orderId, options = {}) => {
    const { fromVoice = false } = options;

    setDeliveries((prev) =>
      prev.map((delivery) =>
        delivery.orderId === orderId
          ? { ...delivery, status: "Completed" }
          : delivery,
      ),
    );

    if (fromVoice) {
      toast.success(`Voice: order ${orderId} marked delivered`);
    } else {
      toast.success(`Order ${orderId} marked as delivered`);
    }
  };

  const handleVoiceCommand = (command) => {
    return processDeliveryVoiceCommand({
      command,
      deliveries,
      onMarkDelivered: markAsDelivered,
    });
  };

  const pendingCount = dynamicStats[2]?.value ?? 0;
  const userName = currentUser?.name || "Delivery User";
  const userEmail = currentUser?.email || "";
  const userRole = currentUser?.role || "Delivery Person";

  return (
    <DashboardLayout
      title="Delivery Dashboard"
      navItems={navItems}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-white">
              Delivery Dashboard
            </h2>
            <p className="mt-0.5 text-slate-300">
              Welcome back, {userName}. You have {pendingCount} pending tasks.
            </p>
            <p className="mt-1 text-sm text-slate-400">{userEmail}</p>
          </div>
          <span className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1 text-sm font-medium text-cyan-300">
            {userRole}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 inline-flex rounded-lg bg-cyan-500/10 p-2 text-cyan-300">
              <ClipboardList size={16} />
            </div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {dynamicStats[0]?.label || deliveryStats[0].label}
            </p>
            <p className="mt-1 text-4xl font-bold text-white">
              {dynamicStats[0]?.value ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="inline-flex rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
                <CircleCheck size={16} />
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
                Target met
              </span>
            </div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {dynamicStats[1]?.label || deliveryStats[1].label}
            </p>
            <p className="mt-1 text-4xl font-bold text-white">
              {dynamicStats[1]?.value ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="inline-flex rounded-lg bg-amber-500/10 p-2 text-amber-300">
                <Clock3 size={16} />
              </div>
              <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-300">
                Urgent
              </span>
            </div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {dynamicStats[2]?.label || deliveryStats[2].label}
            </p>
            <p className="mt-1 text-4xl font-bold text-white">
              {dynamicStats[2]?.value ?? 0}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <VoicePanel
          title=""
          onProcessCommand={handleVoiceCommand}
          idleHint="Try: Show pending deliveries"
        />
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="text-xl font-semibold text-white">Active Shipments</h3>
          <button
            type="button"
            className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
          >
            View all
          </button>
        </div>

        <table className="min-w-full text-sm text-slate-200">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                Order ID
              </th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                Item Name
              </th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                Destination
              </th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                Customer Phone
              </th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr key={delivery.orderId} className="border-t border-slate-800">
                <td className="px-4 py-3 font-semibold text-cyan-300">
                  {delivery.orderId}
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {delivery.itemName || "—"}
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {delivery.destination}
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {delivery.customerPhone || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      delivery.status === "Completed"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {delivery.status === "Completed" ? "Delivered" : "Pending"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={delivery.status === "Completed"}
                    onClick={() => markAsDelivered(delivery.orderId)}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Truck size={14} />
                    Mark as Delivered
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardLayout>
  );
}

export default DeliveryDashboard;
