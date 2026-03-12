import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import { dispatcherAPI } from "../utils/api";

// Helper function to format status for display
const toTitleStatus = (status) =>
  (status || "")
    .toString()
    .trim()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

// Helper function to get status badge color
const getStatusColor = (status) => {
  const normalizedStatus = (status || "").toString().toLowerCase();
  
  switch (normalizedStatus) {
    case "created":
      return "bg-slate-600 text-slate-100";
    case "picked":
      return "bg-blue-600 text-blue-100";
    case "packed":
      return "bg-purple-600 text-purple-100";
    case "out_for_delivery":
      return "bg-yellow-600 text-yellow-100";
    case "delivered":
      return "bg-green-600 text-green-100";
    case "cancelled":
    case "failed":
      return "bg-red-600 text-red-100";
    default:
      return "bg-gray-600 text-gray-100";
  }
};

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid Date";
  }
};

// Dispatcher dashboard for monitoring all shipments
function DispatcherDashboard({ theme, onToggleTheme }) {
  const navItems = [
    { label: "Dashboard", path: "/dispatcher" },
    { label: "Live Shipments", path: "/dispatcher" },
    { label: "Alerts", path: "/dispatcher" },
  ];

  const [orders, setOrders] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load all orders
  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const data = await dispatcherAPI.getAllOrders();
      setOrders(data || []);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Failed to load orders");
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load dashboard statistics
  const loadDashboardData = async () => {
    try {
      const data = await dispatcherAPI.getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard statistics");
    }
  };

  useEffect(() => {
    loadOrders();
    loadDashboardData();

    // Auto-refresh every 15 seconds to show real-time updates
    const interval = setInterval(() => {
      loadOrders();
      loadDashboardData();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Calculate statistics for display
  const stats = [
    {
      label: "Total Orders",
      value: dashboardData?.total_orders || 0,
    },
    {
      label: "Out for Delivery",
      value: dashboardData?.status_breakdown?.out_for_delivery || 0,
    },
    {
      label: "Delivered Today",
      value: dashboardData?.status_breakdown?.delivered || 0,
    },
  ];

  // Alert data (placeholder for now)
  const alerts = [
    {
      type: "Delivery Delayed",
      count: dashboardData?.alerts?.delivery_delayed || 0,
      color: "text-yellow-500",
    },
    {
      type: "Package Damaged",
      count: dashboardData?.alerts?.package_damaged || 0,
      color: "text-red-500",
    },
    {
      type: "Customer Not Available",
      count: dashboardData?.alerts?.customer_not_available || 0,
      color: "text-orange-500",
    },
  ];

  return (
    <DashboardLayout
      title="Dispatcher Dashboard"
      navItems={navItems}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      {/* Statistics Section */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} title={stat.label} value={stat.value} />
        ))}
      </section>

      {/* Alerts Panel */}
      <section className="mb-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Alerts
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {alerts.map((alert) => (
            <div
              key={alert.type}
              className="rounded-xl border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-slate-900"
            >
              <div className={`text-2xl font-bold ${alert.color}`}>
                {alert.count}
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {alert.type}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Shipments Table */}
      <section className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-950">
        <div className="mb-4 flex items-center justify-between px-5 pt-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Live Shipments
          </h2>
          <button
            onClick={() => {
              loadOrders();
              loadDashboardData();
            }}
            disabled={isLoading}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        
        <table className="min-w-full table-auto text-sm text-slate-200">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-5 py-4 text-left font-semibold">Order ID</th>
              <th className="px-5 py-4 text-left font-semibold">Product Name</th>
              <th className="px-5 py-4 text-left font-semibold">Driver Name</th>
              <th className="px-5 py-4 text-left font-semibold">Destination</th>
              <th className="px-5 py-4 text-left font-semibold">Status</th>
              <th className="px-5 py-4 text-left font-semibold">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="px-5 py-8 text-center text-slate-400"
                >
                  {isLoading ? "Loading shipments..." : "No shipments found"}
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.order_id}
                  className="border-t border-slate-800 text-slate-100 hover:bg-slate-900"
                >
                  <td className="px-5 py-4 align-middle font-medium text-cyan-300">
                    {order.order_id}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    {order.product_name}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    {order.delivery_person_assigned}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    {order.destination}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(order.status)}`}
                    >
                      {toTitleStatus(order.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle text-slate-400">
                    {formatTimestamp(
                      order.delivered_at || order.packed_at || order.created_at
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </DashboardLayout>
  );
}

export default DispatcherDashboard;
