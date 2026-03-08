import {
  ClipboardList,
  CircleCheck,
  PackageSearch,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import VoicePanel from "../components/VoicePanel";
import { getCurrentUser } from "../utils/auth";
import { voiceAPI, warehouseAPI } from "../utils/api";

const toTitleStatus = (status) =>
  (status || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

// Warehouse dashboard powered by backend warehouse endpoints.
function WarehouseDashboard({ theme, onToggleTheme }) {
  const currentUser = getCurrentUser();

  const navItems = [
    { label: "Dashboard", path: "/warehouse" },
    { label: "Pick List", path: "/warehouse" },
    { label: "Inventory", path: "/warehouse" },
    { label: "Settings", path: "/warehouse" },
  ];

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await warehouseAPI.getPendingProducts();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || "Unable to load warehouse orders");
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status === "created").length,
    [orders],
  );

  const packedCount = useMemo(
    () => orders.filter((order) => order.status === "packed").length,
    [orders],
  );

  const markAsPacked = async (orderId, options = {}) => {
    const { fromVoice = false } = options;
    try {
      await warehouseAPI.markPacked(orderId);
      await loadOrders();
      if (fromVoice) {
        toast.success(`Voice: order ${orderId} marked packed`);
      } else {
        toast.success(`Order ${orderId} marked as packed`);
      }
    } catch (error) {
      toast.error(error.message || `Failed to mark ${orderId} as packed`);
    }
  };

  const handleVoiceCommand = async (command) => {
    const result = await voiceAPI.processCommand({
      command,
      user_role: currentUser?.role || "warehouse",
      user_name: currentUser?.name || "",
    });

    if (result.action_performed) {
      await loadOrders();
    }

    return result.response;
  };

  const userName = currentUser?.name || "Warehouse User";
  const userEmail = currentUser?.email || "";
  const userRole = currentUser?.role || "Warehouse Staff";

  return (
    <DashboardLayout
      title="Warehouse Dashboard"
      navItems={navItems}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-white">
              Warehouse Dashboard
            </h2>
            <p className="mt-0.5 text-slate-300">
              Welcome back, {userName}. You have {pendingCount} pending pick
              tasks.
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
              Total Orders
            </p>
            <p className="mt-1 text-4xl font-bold text-white">
              {orders.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="inline-flex rounded-lg bg-amber-500/10 p-2 text-amber-300">
                <PackageSearch size={16} />
              </div>
              <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-300">
                Pending
              </span>
            </div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Pending Pick Orders
            </p>
            <p className="mt-1 text-4xl font-bold text-white">{pendingCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="inline-flex rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
                <CircleCheck size={16} />
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
                Packed
              </span>
            </div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Packed Orders
            </p>
            <p className="mt-1 text-4xl font-bold text-white">{packedCount}</p>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <VoicePanel
          title=""
          onProcessCommand={handleVoiceCommand}
          idleHint="Try: Show my orders, Mark order ORD-1003 packed"
        />
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="text-xl font-semibold text-white">Active Pick List</h3>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 hover:text-cyan-200"
          >
            <Warehouse size={14} />
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
                Item
              </th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                Delivery Person Name
              </th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                Delivery Person Phone Number
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
            {orders.map((order) => (
              <tr key={order.order_id} className="border-t border-slate-800">
                <td className="px-4 py-3 font-semibold text-cyan-300">
                  {order.order_id}
                </td>
                <td className="px-4 py-3 text-slate-200">{order.product_name}</td>
                <td className="px-4 py-3 text-slate-200">
                  {order.delivery_person_assigned || "-"}
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {order.delivery_person_phone || "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      order.status === "packed"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {toTitleStatus(order.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={order.status !== "created" || isLoading}
                    onClick={() => markAsPacked(order.order_id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Mark as Packed
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

export default WarehouseDashboard;
