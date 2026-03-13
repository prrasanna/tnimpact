import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import { deliveryAPI } from "../utils/api";

const toTitleStatus = (status) =>
  (status || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const parseCoordinates = (value) => {
  if (!value || typeof value !== "string") return null;
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length !== 2) return null;

  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return { lat, lon };
};

const buildMapEmbedUrl = ({ lat, lon }) =>
  `https://www.google.com/maps?output=embed&q=${lat},${lon}&z=15&hl=en`;

const buildGoogleMapsUrl = ({ lat, lon }) =>
  `https://www.google.com/maps?q=${lat},${lon}&hl=en`;

function DeliveryRoute({ theme, onToggleTheme }) {
  const navItems = [
    { label: "Dashboard", path: "/delivery", end: true },
    { label: "My Deliveries", path: "/delivery/my-deliveries" },
    { label: "Optimized Route", path: "/delivery/route" },
    { label: "Settings", path: "/delivery/settings" },
  ];

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await deliveryAPI.getMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || "Unable to load optimized route data");
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const routeOrders = useMemo(
    () =>
      orders.filter((order) =>
        ["packed", "out_for_delivery"].includes(
          (order.status || "").toLowerCase(),
        ),
      ),
    [orders],
  );

  const activeOutForDeliveryOrder = useMemo(
    () =>
      routeOrders.find(
        (order) => (order.status || "").toLowerCase() === "out_for_delivery",
      ) || null,
    [routeOrders],
  );

  const customerCoords = useMemo(
    () => parseCoordinates(activeOutForDeliveryOrder?.source_location || ""),
    [activeOutForDeliveryOrder],
  );

  return (
    <DashboardLayout
      title="Optimized Route"
      navItems={navItems}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Optimized Route</h2>
          <button
            type="button"
            onClick={loadOrders}
            disabled={isLoading}
            className="rounded-lg border border-cyan-500 px-3 py-1.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <p className="mb-4 text-slate-300">
          Source location captured at order creation and driver start location are shown here.
        </p>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <table className="min-w-full text-sm text-slate-200">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                  Order ID
                </th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                  Customer Location GPS
                </th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                  Driver Start Location
                </th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                  Destination
                </th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-slate-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {routeOrders.map((order) => (
                <tr key={order.order_id} className="border-t border-slate-800">
                  <td className="px-4 py-3 font-semibold text-cyan-300">
                    {order.order_id}
                  </td>
                  <td className="px-4 py-3">{order.source_location || "Not captured"}</td>
                  <td className="px-4 py-3">
                    {order.delivery_start_location || "Will appear when driver starts delivery"}
                  </td>
                  <td className="px-4 py-3">{order.destination || "-"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-300">
                      {toTitleStatus(order.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {routeOrders.length === 0 && (
                <tr className="border-t border-slate-800">
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No route-ready orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {activeOutForDeliveryOrder && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-lg font-semibold text-white">
              Customer Map for {activeOutForDeliveryOrder.order_id}
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              Customer GPS: {activeOutForDeliveryOrder.source_location || "Not captured"}
            </p>

            {customerCoords ? (
              <>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-700">
                  <iframe
                    title="Customer GPS Map"
                    src={buildMapEmbedUrl(customerCoords)}
                    className="h-80 w-full"
                    loading="lazy"
                  />
                </div>
                <a
                  href={buildGoogleMapsUrl(customerCoords)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-lg border border-cyan-500 px-3 py-1.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/10"
                >
                  Open in Google Maps
                </a>
              </>
            ) : (
              <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
                Exact GPS coordinates are not available for this order. Ask admin to capture location as latitude,longitude.
              </div>
            )}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default DeliveryRoute;
