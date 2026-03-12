import { PackageCheck, Warehouse } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import { warehouseAPI } from "../utils/api";

const toTitleStatus = (status) =>
  (status || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

// Warehouse Packed Orders List - shows only packed orders
function WarehousePackedList({ theme, onToggleTheme }) {
  const navItems = [
    { label: "Dashboard", path: "/warehouse" },
    { label: "Packed List", path: "/warehouse/packed" },
    { label: "Inventory", path: "/warehouse/inventory" },
    { label: "Settings", path: "/warehouse/settings" },
  ];

  const [packedOrders, setPackedOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPackedOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await warehouseAPI.getPendingProducts();
      // Filter to show only packed orders
      const packed = Array.isArray(data) 
        ? data.filter(order => order.status === "packed")
        : [];
      setPackedOrders(packed);
    } catch (error) {
      toast.error(error.message || "Unable to load packed orders");
      setPackedOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackedOrders();
  }, [loadPackedOrders]);

  return (
    <DashboardLayout
      title="Packed Orders"
      navItems={navItems}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-white">Packed Orders</h2>
            <p className="mt-0.5 text-slate-300">
              Orders ready for delivery. Total: {packedOrders.length}
            </p>
          </div>
          <div className="inline-flex rounded-lg bg-emerald-500/10 p-3 text-emerald-300">
            <PackageCheck size={24} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="inline-flex rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
              <PackageCheck size={16} />
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
              Ready
            </span>
          </div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Packed Orders
          </p>
          <p className="mt-1 text-4xl font-bold text-white">
            {packedOrders.length}
          </p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="text-xl font-semibold text-white">Packed Orders List</h3>
          <button
            type="button"
            onClick={loadPackedOrders}
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 hover:text-cyan-200"
          >
            <Warehouse size={14} />
            Refresh
          </button>
        </div>

        {packedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <PackageCheck size={48} className="mb-4 text-slate-600" />
            <p className="text-lg font-medium text-slate-400">
              No packed orders yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Orders will appear here once they are marked as packed
            </p>
          </div>
        ) : (
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
                  Delivery Person Name
                </th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                  Delivery Person Phone Number
                </th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {packedOrders.map((order) => (
                <tr key={order.order_id} className="border-t border-slate-800">
                  <td className="px-4 py-3 font-semibold text-cyan-300">
                    {order.order_id}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {order.product_name}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {order.delivery_person_assigned || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {order.delivery_person_phone || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
                      {toTitleStatus(order.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </DashboardLayout>
  );
}

export default WarehousePackedList;
