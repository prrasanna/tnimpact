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

const DISTRICT_WAREHOUSE_CODES = {
  chennai: "CHN",
  coimbatore: "CBE",
  dindigul: "DGL",
  erode: "ERD",
  madurai: "MDU",
  salem: "SLM",
  thanjavur: "TNJ",
  tiruchirappalli: "TRI",
  trichy: "TRI",
  tirunelveli: "TNV",
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

const getDistrictWarehouseName = (destination, fallbackWarehouse) => {
  const normalizedDestination = (destination || "")
    .toString()
    .trim()
    .toLowerCase();
  const districtCode = DISTRICT_WAREHOUSE_CODES[normalizedDestination];

  if (districtCode) {
    return `${districtCode} Warehouse`;
  }

  return normalizeWarehouseName(fallbackWarehouse) || "-";
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

const formatDateTimeForInput = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatFieldLabel = (key) =>
  (key || "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Object]";
    }
  }
  return String(value);
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
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailForm, setDetailForm] = useState({
    sourceLocation: "",
    deliveryStartLocation: "",
    deliveryStartedAt: "",
    deliveredAt: "",
    specialInstructions: "",
    deliveryNotes: "",
  });
  const [formData, setFormData] = useState({
    productName: "",
    orderId: "",
    destination: "",
    warehouse: "",
    deliveryPerson: "",
    deliveryPersonPhone: "",
    deliveryPersonEmail: "",
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
        id: product._id,
        productName: product.product_name,
        orderId: normalizeOrderId(product.order_id),
        destination: product.destination,
        warehouse: getDistrictWarehouseName(
          product.destination,
          product.warehouse_assigned,
        ),
        warehouseAssigned: product.warehouse_assigned,
        deliveryPerson: product.delivery_person_assigned,
        deliveryPersonPhone: normalizePhoneNumber(
          product.delivery_person_phone,
        ),
        deliveryPersonEmail: product.delivery_person_email || "",
        sourceLocation: product.source_location,
        deliveryStartLocation: product.delivery_start_location,
        specialInstructions: product.special_instructions,
        deliveryNotes: product.delivery_notes,
        createdAt: product.created_at,
        status: product.status,
        packedAt: product.packed_at,
        deliveredAt: product.delivered_at,
        deliveryStartedAt: product.delivery_started_at,
        updatedAt: product.updated_at || product.created_at,
        raw: product,
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
        toast.error(
          error.message || "Current location is required to create shipment",
        );
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

    const emailTrimmed = formData.deliveryPersonEmail.trim();
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      toast.error("Please enter a valid email address");
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
            delivery_person_email: formData.deliveryPersonEmail.trim() || undefined,
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
        deliveryPersonEmail: "",
        sourceLocation: "",
      });
      toast.success("Product added successfully");
      await loadDashboardData();
    } catch (error) {
      toast.error(error.message || "Unable to add product");
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setDetailForm({
      sourceLocation: order.sourceLocation || "",
      deliveryStartLocation: order.deliveryStartLocation || "",
      deliveryStartedAt: formatDateTimeForInput(order.deliveryStartedAt),
      deliveredAt: formatDateTimeForInput(order.deliveredAt),
      specialInstructions: order.specialInstructions || "",
      deliveryNotes: order.deliveryNotes || "",
    });
  };

  const closeOrderDetails = () => setSelectedOrder(null);

  const handleDetailFieldChange = (event) => {
    const { name, value } = event.target;
    setDetailForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveOrderDetails = async () => {
    if (!selectedOrder?.orderId) {
      return;
    }

    try {
      setIsSavingDetails(true);
      const response = await fetch(
        `${API_BASE_URL}/admin/dashboard/update-details/${encodeURIComponent(selectedOrder.orderId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_location: detailForm.sourceLocation.trim(),
            delivery_start_location: detailForm.deliveryStartLocation.trim(),
            delivery_started_at: detailForm.deliveryStartedAt
              ? new Date(detailForm.deliveryStartedAt).toISOString()
              : null,
            delivered_at: detailForm.deliveredAt
              ? new Date(detailForm.deliveredAt).toISOString()
              : null,
            special_instructions: detailForm.specialInstructions.trim(),
            delivery_notes: detailForm.deliveryNotes.trim(),
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || "Failed to update order details");
      }

      const updated = await response.json();
      const updatedOrder = {
        id: updated._id,
        productName: updated.product_name,
        orderId: normalizeOrderId(updated.order_id),
        destination: updated.destination,
        warehouse: getDistrictWarehouseName(
          updated.destination,
          updated.warehouse_assigned,
        ),
        warehouseAssigned: updated.warehouse_assigned,
        deliveryPerson: updated.delivery_person_assigned,
        deliveryPersonPhone: normalizePhoneNumber(
          updated.delivery_person_phone,
        ),
        deliveryPersonEmail: updated.delivery_person_email || "",
        sourceLocation: updated.source_location,
        deliveryStartLocation: updated.delivery_start_location,
        specialInstructions: updated.special_instructions,
        deliveryNotes: updated.delivery_notes,
        createdAt: updated.created_at,
        status: updated.status,
        packedAt: updated.packed_at,
        deliveredAt: updated.delivered_at,
        deliveryStartedAt: updated.delivery_started_at,
        updatedAt: updated.updated_at || updated.created_at,
        raw: updated,
      };

      setSelectedOrder(updatedOrder);
      setProducts((prev) =>
        prev.map((product) =>
          product.orderId === updatedOrder.orderId ? updatedOrder : product,
        ),
      );
      toast.success("Order details updated");
    } catch (error) {
      toast.error(error.message || "Unable to update order details");
    } finally {
      setIsSavingDetails(false);
    }
  };

  useEffect(() => {
    if (!selectedOrder) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeOrderDetails();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedOrder]);

  const additionalMongoDetails = useMemo(() => {
    if (!selectedOrder?.raw) {
      return [];
    }

    const hiddenKeys = new Set([
      "_id",
      "order_id",
      "product_name",
      "destination",
      "warehouse_assigned",
      "delivery_person_assigned",
      "delivery_person_phone",
      "delivery_person_email",
      "status",
      "created_at",
      "updated_at",
      "packed_at",
      "delivered_at",
      "delivery_started_at",
      "source_location",
      "delivery_start_location",
      "special_instructions",
      "delivery_notes",
    ]);

    return Object.entries(selectedOrder.raw).filter(
      ([key, value]) => !hiddenKeys.has(key) && value !== undefined,
    );
  }, [selectedOrder]);

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
            name="orderId"
            placeholder="Order ID "
            value={formData.orderId}
            onChange={handleChange}
            className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
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
            name="destination"
            placeholder="Destination"
            value={formData.destination}
            onChange={handleChange}
            className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
          <input
            required
            name="warehouse"
            placeholder="Assign Warehouse"
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
            type="email"
            name="deliveryPersonEmail"
            placeholder="Delivery Person Email Address"
            value={formData.deliveryPersonEmail}
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
                toast.error(
                  error.message || "Unable to capture current location",
                );
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
              <th className="px-5 py-4 text-left font-semibold">Order ID</th>
              <th className="px-5 py-4 text-left font-semibold">
                Product Name
              </th>
              <th className="px-5 py-4 text-left font-semibold">Destination</th>
              <th className="px-5 py-4 text-left font-semibold">Warehouse</th>
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
                <td className="px-5 py-4 align-middle font-medium text-cyan-300">
                  {product.orderId}
                </td>
                <td className="px-5 py-4 align-middle">
                  {product.productName}
                </td>
                <td className="px-5 py-4 align-middle">
                  {product.destination}
                </td>
                <td className="px-5 py-4 align-middle">{product.warehouse}</td>
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
                    onClick={() => handleViewDetails(product)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                    title="View shipment details"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-slate-400"
                >
                  {isLoading ? "Loading orders..." : "No orders found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Order Details</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Complete shipment information from MongoDB.
                </p>
              </div>
              <button
                type="button"
                onClick={closeOrderDetails}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Product Name
                </p>
                <p className="mt-1 font-medium">
                  {formatDetailValue(selectedOrder.productName)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Order ID
                </p>
                <p className="mt-1 font-medium text-cyan-300">
                  {formatDetailValue(selectedOrder.orderId)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Destination
                </p>
                <p className="mt-1 font-medium">
                  {formatDetailValue(selectedOrder.destination)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Warehouse
                </p>
                <p className="mt-1 font-medium">
                  {formatDetailValue(selectedOrder.warehouse)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Delivery Person Name
                </p>
                <p className="mt-1 font-medium">
                  {formatDetailValue(selectedOrder.deliveryPerson)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Delivery Person Phone Number
                </p>
                <p className="mt-1 font-medium">
                  {formatDetailValue(selectedOrder.deliveryPersonPhone)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Delivery Person Email
                </p>
                <p className="mt-1 font-medium">
                  {formatDetailValue(selectedOrder.deliveryPersonEmail)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Order Status
                </p>
                <p className="mt-1 font-medium">
                  {toTitleStatus(selectedOrder.status)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Last Updated
                </p>
                <p className="mt-1 font-medium">
                  {formatDateTime(selectedOrder.updatedAt)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Created At
                </p>
                <p className="mt-1 font-medium">
                  {formatDateTime(selectedOrder.createdAt)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Packed At
                </p>
                <p className="mt-1 font-medium">
                  {formatDateTime(selectedOrder.packedAt)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Delivery Started At
                </p>
                <p className="mt-1 font-medium">
                  {formatDateTime(selectedOrder.deliveryStartedAt)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Delivered At
                </p>
                <p className="mt-1 font-medium">
                  {formatDateTime(selectedOrder.deliveredAt)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Source Location
                </p>
                <input
                  type="text"
                  name="sourceLocation"
                  value={detailForm.sourceLocation}
                  onChange={handleDetailFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  placeholder="Enter source location"
                />
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Delivery Start Location
                </p>
                <input
                  type="text"
                  name="deliveryStartLocation"
                  value={detailForm.deliveryStartLocation}
                  onChange={handleDetailFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  placeholder="Enter delivery start location"
                />
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Delivery Started At
                </p>
                <input
                  type="datetime-local"
                  name="deliveryStartedAt"
                  value={detailForm.deliveryStartedAt}
                  onChange={handleDetailFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Delivered At
                </p>
                <input
                  type="datetime-local"
                  name="deliveredAt"
                  value={detailForm.deliveredAt}
                  onChange={handleDetailFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Special Instructions
                </p>
                <textarea
                  name="specialInstructions"
                  value={detailForm.specialInstructions}
                  onChange={handleDetailFieldChange}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  placeholder="Enter special instructions"
                />
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Delivery Notes
                </p>
                <textarea
                  name="deliveryNotes"
                  value={detailForm.deliveryNotes}
                  onChange={handleDetailFieldChange}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  placeholder="Enter delivery notes"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={saveOrderDetails}
                disabled={isSavingDetails}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingDetails ? "Saving..." : "Save Details"}
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950 p-3">
              <h4 className="text-sm font-semibold text-slate-200">
                Additional MongoDB Details
              </h4>
              {additionalMongoDetails.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">
                  No additional fields available.
                </p>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {additionalMongoDetails.map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                    >
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {formatFieldLabel(key)}
                      </p>
                      <p className="mt-1 text-sm text-slate-200">
                        {formatDetailValue(value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default AdminDashboard;
