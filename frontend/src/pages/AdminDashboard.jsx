import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const initialStats = {
  totalOrders: 0,
  pendingDeliveries: 0,
  activeDrivers: 0,
  deliveredOrders: 0,
};

const normalizeOrderId = (value) => {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) {
    return (value || "").trim().toUpperCase();
  }
  return `ORD-${digits.padStart(4, "0")}`;
};

const normalizePhoneNumber = (value) => {
  const digits = (value || "").replace(/\D/g, "");
  const localNumber = digits.length >= 10 ? digits.slice(-10) : digits;
  if (localNumber.length !== 10) {
    return value?.trim() || "";
  }
  return `+91 ${localNumber.slice(0, 5)} ${localNumber.slice(5)}`;
};

const normalizeWarehouseName = (value) => {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "";
  }

  const letterMatch = trimmed.match(/[A-Za-z]/g);
  if (!letterMatch?.length) {
    return trimmed;
  }

  const lastLetter = letterMatch[letterMatch.length - 1].toUpperCase();
  return `Warehouse ${lastLetter}`;
};

const isValidOrderId = (value) => /^ORD-\d{4,}$/.test(value);
const isValidPhoneNumber = (value) => /^\+91\s\d{5}\s\d{5}$/.test(value);
const isValidWarehouseName = (value) => /^Warehouse\s[A-Z]$/.test(value);

const toTitleStatus = (status) =>
  (status || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

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
    default:
      return "bg-gray-600 text-gray-100";
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
};

// Admin dashboard with product assignment form and table.
function AdminDashboard({ theme, onToggleTheme }) {
  const navItems = [
    { label: "Dashboard", path: "/admin" },
    { label: "Create Shipment", path: "/admin" },
    { label: "Assign Delivery", path: "/admin" },
    { label: "Manage Warehouse", path: "/admin" },
  ];

  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(initialStats);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    productName: "",
    orderId: "",
    destination: "",
    warehouse: "",
    deliveryPerson: "",
    deliveryPersonPhone: "",
    sourceLocation: "",
  });

  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        },
        () => reject(new Error("Location access denied or unavailable")),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/dashboard-data`);

      if (!response.ok) {
        throw new Error("Failed to fetch admin dashboard data");
      }

      const data = await response.json();
      const mappedProducts = (data.products || []).map((product) => ({
        productName: product.product_name,
        orderId: normalizeOrderId(product.order_id),
        destination: product.destination,
        warehouse: normalizeWarehouseName(product.warehouse_assigned),
        deliveryPerson: product.delivery_person_assigned,
        deliveryPersonPhone: normalizePhoneNumber(
          product.delivery_person_phone,
        ),
        status: product.status,
        updatedAt: product.updated_at || product.created_at,
      }));

      setProducts(mappedProducts);
      setStats({
        totalOrders: data.stats?.total_orders ?? 0,
        pendingDeliveries: data.stats?.pending_deliveries ?? 0,
        activeDrivers: data.stats?.active_drivers ?? 0,
        deliveredOrders: data.stats?.delivered_orders ?? 0,
      });
    } catch {
      toast.error("Unable to load dashboard data from database");
      setProducts([]);
      setStats(initialStats);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const dynamicStats = useMemo(
    () => [
      { label: "Total Orders", value: stats.totalOrders },
      { label: "Pending Deliveries", value: stats.pendingDeliveries },
      { label: "Active Drivers", value: stats.activeDrivers },
      { label: "Delivered Orders", value: stats.deliveredOrders },
    ],
    [stats],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    let sourceLocation = formData.sourceLocation.trim();
    if (!sourceLocation) {
      try {
        sourceLocation = await getCurrentLocation();
      } catch (error) {
        toast.error(error.message || "Current location is required to create shipment");
        return;
      }
    }

    const payload = {
      productName: formData.productName.trim(),
      orderId: normalizeOrderId(formData.orderId),
      destination: formData.destination.trim(),
      warehouse: normalizeWarehouseName(formData.warehouse),
      deliveryPerson: formData.deliveryPerson.trim(),
      deliveryPersonPhone: normalizePhoneNumber(formData.deliveryPersonPhone),
      sourceLocation,
    };

    if (!payload.productName) {
      toast.error("Product Name is required");
      return;
    }

    if (!isValidOrderId(payload.orderId)) {
      toast.error("Order ID must be in format ORD-1001");
      return;
    }

    if (!payload.destination) {
      toast.error("Destination is required");
      return;
    }

    if (!isValidWarehouseName(payload.warehouse)) {
      toast.error("Warehouse must be in format Warehouse A");
      return;
    }

    if (!payload.deliveryPerson) {
      toast.error("Delivery Person is required");
      return;
    }

    if (!isValidPhoneNumber(payload.deliveryPersonPhone)) {
      toast.error("Phone number must be in format +91 98765 43210");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/dashboard/add-product`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_id: payload.orderId,
            product_name: payload.productName,
            destination: payload.destination,
            warehouse_assigned: payload.warehouse,
            delivery_person_assigned: payload.deliveryPerson,
            delivery_person_phone: payload.deliveryPersonPhone,
            source_location: payload.sourceLocation,
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || "Failed to add product");
      }

      setFormData({
        productName: "",
        orderId: "",
        destination: "",
        warehouse: "",
        deliveryPerson: "",
        deliveryPersonPhone: "",
        sourceLocation: "",
      });
      toast.success("Product added successfully");
      await loadDashboardData();
    } catch (error) {
      toast.error(error.message || "Unable to add product");
    }
  };

  const handleViewDetails = (orderId) => {
    toast.success(`View details for ${orderId} - Feature coming soon!`);
    // Future: Navigate to detail page or open modal
    // Example: navigate(`/admin/shipment/${orderId}`);
  };

  return (
    <DashboardLayout
      title="Admin Dashboard"
      navItems={navItems}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dynamicStats.map((stat) => (
          <StatCard key={stat.label} title={stat.label} value={stat.value} />
        ))}
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Create Shipment
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
          <input
            required
            name="productName"
            placeholder="Product Name"
            value={formData.productName}
            onChange={handleChange}
            className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
          <input
            required
            name="orderId"
            placeholder="Order ID (ORD-1001)"
            value={formData.orderId}
            onChange={handleChange}
            className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
          <input
            required
            name="destination"
            placeholder="Destination"
            value={formData.destination}
            onChange={handleChange}
            className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
          <input
            required
            name="warehouse"
            placeholder="Assign Warehouse (Warehouse A)"
            value={formData.warehouse}
            onChange={handleChange}
            className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
          <input
            required
            name="deliveryPerson"
            placeholder="Assign Delivery Person"
            value={formData.deliveryPerson}
            onChange={handleChange}
            className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
          <input
            required
            name="deliveryPersonPhone"
            placeholder="Delivery Person Phone Number (+91 98765 43210)"
            value={formData.deliveryPersonPhone}
            onChange={handleChange}
            className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
          <input
            name="sourceLocation"
            placeholder="Current Location (Auto-captured if empty)"
            value={formData.sourceLocation}
            onChange={handleChange}
            className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-2 font-semibold text-white"
          >
            Create Shipment
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                const location = await getCurrentLocation();
                setFormData((prev) => ({ ...prev, sourceLocation: location }));
                toast.success("Current location captured");
              } catch (error) {
                toast.error(error.message || "Unable to capture current location");
              }
            }}
            className="rounded-xl border border-cyan-500 px-4 py-2 font-semibold text-cyan-300 hover:bg-cyan-500/10"
          >
            Use My Current Location
          </button>
        </form>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-950">
        <table className="min-w-full table-auto text-sm text-slate-200">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-5 py-4 text-left font-semibold">
                Product Name
              </th>
              <th className="px-5 py-4 text-left font-semibold">Order ID</th>
              <th className="px-5 py-4 text-left font-semibold">Destination</th>
              <th className="px-5 py-4 text-left font-semibold">Warehouse</th>
              <th className="px-5 py-4 text-left font-semibold">
                Delivery Person
              </th>
              <th className="px-5 py-4 text-left font-semibold">
                Delivery Person Phone Number
              </th>
              <th className="px-5 py-4 text-left font-semibold">Status</th>
              <th className="px-5 py-4 text-left font-semibold">
                Last Updated
              </th>
              <th className="px-5 py-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr
                key={`${product.orderId}-${index}`}
                className="border-t border-slate-800 text-slate-100"
              >
                <td className="px-5 py-4 align-middle">
                  {product.productName}
                </td>
                <td className="px-5 py-4 align-middle font-medium text-cyan-300">
                  {product.orderId}
                </td>
                <td className="px-5 py-4 align-middle">
                  {product.destination}
                </td>
                <td className="px-5 py-4 align-middle">{product.warehouse}</td>
                <td className="px-5 py-4 align-middle">
                  {product.deliveryPerson}
                </td>
                <td className="px-5 py-4 align-middle">
                  {product.deliveryPersonPhone}
                </td>
                <td className="px-5 py-4 align-middle">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(product.status)}`}
                  >
                    {toTitleStatus(product.status)}
                  </span>
                </td>
                <td className="px-5 py-4 align-middle text-slate-300">
                  {formatDateTime(product.updatedAt)}
                </td>
                <td className="px-5 py-4 align-middle text-center">
                  <button
                    onClick={() => handleViewDetails(product.orderId)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                    title="View shipment details"
                  >
                    View Details
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

export default AdminDashboard;
