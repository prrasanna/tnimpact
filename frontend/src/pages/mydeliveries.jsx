import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import { getCurrentUser } from "../utils/auth";
import { deliveryAPI } from "../utils/api";

const toTitleStatus = (status) =>
  (status || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDeliveredAt = (timestamp) => {
  if (!timestamp) {
    return "-";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

function MyDeliveries({ theme, onToggleTheme }) {
  const currentUser = getCurrentUser();

  const navItems = [
    { label: "Dashboard", path: "/delivery", end: true },
    { label: "My Deliveries", path: "/delivery/my-deliveries" },
    { label: "Optimized Route", path: "/delivery/route" },
    { label: "Settings", path: "/delivery/settings" },
  ];

  const [deliveries, setDeliveries] = useState([]);

  const loadDeliveries = useCallback(async () => {
    try {
      const data = await deliveryAPI.getMyOrders();
      setDeliveries(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || "Unable to load delivery orders");
      setDeliveries([]);
    }
  }, []);

  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  const deliveredOrders = useMemo(
    () => deliveries.filter((delivery) => delivery.status === "delivered"),
    [deliveries],
  );

  const userName = currentUser?.name || "Delivery User";

  return (
    <DashboardLayout
      title="My Deliveries"
      navItems={navItems}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <h2 className="text-3xl font-bold text-white">My Deliveries</h2>
        <p className="mt-1 text-slate-300">
          {userName}, you have completed {deliveredOrders.length} deliveries.
        </p>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="text-xl font-semibold text-white">Delivered Orders</h3>
          <span className="text-sm font-medium text-cyan-300">
            {deliveredOrders.length} delivered
          </span>
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
                Delivered At
              </th>
            </tr>
          </thead>
          <tbody>
            {deliveredOrders.map((delivery) => (
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
                  <span className="inline-flex rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
                    {toTitleStatus(delivery.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {formatDeliveredAt(delivery.delivered_at)}
                </td>
              </tr>
            ))}
            {deliveredOrders.length === 0 && (
              <tr className="border-t border-slate-800">
                <td className="px-4 py-6 text-center text-slate-400" colSpan={6}>
                  No completed deliveries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </DashboardLayout>
  );
}

export default MyDeliveries;
