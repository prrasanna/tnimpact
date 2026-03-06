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

// Admin dashboard with product assignment form and table.
function AdminDashboard({ theme, onToggleTheme }) {
  const navItems = [
    { label: "Dashboard", path: "/admin" },
    { label: "Add Product", path: "/admin" },
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
        deliveryPersonPhone: normalizePhoneNumber(product.delivery_person_phone),
      }));

      setProducts(mappedProducts);
      setStats({
        totalOrders: data.stats?.total_orders ?? 0,
        pendingDeliveries: data.stats?.pending_deliveries ?? 0,
        activeDrivers: data.stats?.active_drivers ?? 0,
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
    ],
    [stats],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      productName: formData.productName.trim(),
      orderId: normalizeOrderId(formData.orderId),
      destination: formData.destination.trim(),
      warehouse: normalizeWarehouseName(formData.warehouse),
      deliveryPerson: formData.deliveryPerson.trim(),
      deliveryPersonPhone: normalizePhoneNumber(formData.deliveryPersonPhone),
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
      });
      toast.success("Product added successfully");
      await loadDashboardData();
    } catch (error) {
      toast.error(error.message || "Unable to add product");
    }
  };

  return (
    <DashboardLayout
      title="Admin Dashboard"
      navItems={navItems}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dynamicStats.map((stat) => (
          <StatCard key={stat.label} title={stat.label} value={stat.value} />
        ))}
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Add Product
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
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-2 font-semibold text-white md:col-span-2"
          >
            Add Product
          </button>
        </form>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-950">
        <table className="min-w-full table-auto text-sm text-slate-200">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-5 py-4 text-left font-semibold">Product Name</th>
              <th className="px-5 py-4 text-left font-semibold">Order ID</th>
              <th className="px-5 py-4 text-left font-semibold">Destination</th>
              <th className="px-5 py-4 text-left font-semibold">Warehouse</th>
              <th className="px-5 py-4 text-left font-semibold">Delivery Person</th>
              <th className="px-5 py-4 text-left font-semibold">
                Delivery Person Phone Number
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr
                key={`${product.orderId}-${index}`}
                className="border-t border-slate-800 text-slate-100"
              >
                <td className="px-5 py-4 align-middle">{product.productName}</td>
                <td className="px-5 py-4 align-middle font-medium text-cyan-300">
                  {product.orderId}
                </td>
                <td className="px-5 py-4 align-middle">{product.destination}</td>
                <td className="px-5 py-4 align-middle">{product.warehouse}</td>
                <td className="px-5 py-4 align-middle">{product.deliveryPerson}</td>
                <td className="px-5 py-4 align-middle">{product.deliveryPersonPhone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardLayout>
  );
}

export default AdminDashboard;
