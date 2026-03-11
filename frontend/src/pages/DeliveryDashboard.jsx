import { ClipboardList, Clock3, CircleCheck, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import VoicePanel from "../components/VoicePanel";
import { getCurrentUser } from "../utils/auth";
import { deliveryAPI, voiceAPI } from "../utils/api";

const toTitleStatus = (status) =>
  (status || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeStatus = (status) =>
  (status || "").toString().trim().toLowerCase().replace(/\s+/g, "_");

const isPendingDelivery = (status) =>
  ["pending", "packed", "out_for_delivery"].includes(normalizeStatus(status));

// Delivery dashboard powered by backend delivery endpoints.
function DeliveryDashboard({ theme, onToggleTheme }) {
  const currentUser = getCurrentUser();

  const navItems = [
    { label: "Dashboard", path: "/delivery", end: true },
    { label: "My Deliveries", path: "/delivery/my-deliveries" },
    { label: "Optimized Route", path: "/delivery/route" },
    { label: "Settings", path: "/delivery/settings" },
  ];

  const [deliveries, setDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDeliveries = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await deliveryAPI.getMyOrders();
      setDeliveries(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || "Unable to load delivery orders");
      setDeliveries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadDeliveries();
    }, 15000);

    return () => clearInterval(intervalId);
  }, [loadDeliveries]);

  const activeDeliveries = useMemo(
    () =>
      deliveries.filter(
        (delivery) => normalizeStatus(delivery.status) !== "delivered",
      ),
    [deliveries],
  );

  const dynamicStats = useMemo(() => {
    const completed = deliveries.filter(
      (delivery) => normalizeStatus(delivery.status) === "delivered",
    ).length;
    const pending = deliveries.filter(
      (delivery) => normalizeStatus(delivery.status) === "pending",
    ).length;

    return [
      { label: "Active Shipments", value: activeDeliveries.length },
      { label: "Completed Deliveries", value: completed },
      { label: "Pending Deliveries", value: pending },
    ];
  }, [activeDeliveries.length, deliveries]);

  const markAsDelivered = async (orderId, options = {}) => {
    const { fromVoice = false } = options;
    try {
      await deliveryAPI.markDelivered(orderId);
      await loadDeliveries();
      if (fromVoice) {
        toast.success(`Voice: order ${orderId} marked delivered`);
      } else {
        toast.success(`Order ${orderId} marked as delivered`);
      }
    } catch (error) {
      toast.error(error.message || `Failed to mark ${orderId} as delivered`);
    }
  };

  const handleVoiceCommand = async (command) => {
    // Phase 2: Backend now gets user info from JWT token
    const result = await voiceAPI.processCommand({
      command,
    });

    // Reload deliveries if action was performed (order marked delivered, etc.)
    if (result.action_performed) {
      await loadDeliveries();
    }

    return result.response;
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
            <h2 className="text-3xl font-bold text-white">Delivery Dashboard</h2>
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
              {dynamicStats[0]?.label || "Active Shipments"}
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
                Completed
              </span>
            </div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {dynamicStats[1]?.label || "Completed Deliveries"}
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
              {dynamicStats[2]?.label || "Pending Deliveries"}
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
            {activeDeliveries.length} active
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
            {activeDeliveries.map((delivery) => (
              <tr key={delivery.order_id} className="border-t border-slate-800">
                <td className="px-4 py-3 font-semibold text-cyan-300">
                  {delivery.order_id}
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {delivery.product_name || "-"}
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {delivery.destination || "-"}
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {delivery.delivery_person_phone || "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      delivery.status === "delivered"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {toTitleStatus(delivery.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={!isPendingDelivery(delivery.status) || isLoading}
                    onClick={() => markAsDelivered(delivery.order_id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Truck size={14} />
                    Mark as Delivered
                  </button>
                </td>
              </tr>
            ))}
            {activeDeliveries.length === 0 && (
              <tr className="border-t border-slate-800">
                <td className="px-4 py-6 text-center text-slate-400" colSpan={6}>
                  No active shipments. Delivered orders are listed in My Deliveries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </DashboardLayout>
  );
}

export default DeliveryDashboard;
