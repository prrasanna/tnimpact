import { useState } from "react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import { adminStats, initialProducts } from "../data/mockData";

// Admin dashboard with product assignment form and table.
function AdminDashboard({ theme, onToggleTheme }) {
  const navItems = [
    { label: "Dashboard", path: "/admin" },
    { label: "Add Product", path: "/admin" },
    { label: "Assign Delivery", path: "/admin" },
    { label: "Manage Warehouse", path: "/admin" },
  ];

  const [products, setProducts] = useState(initialProducts);
  const [formData, setFormData] = useState({
    productName: "",
    orderId: "",
    destination: "",
    warehouse: "",
    deliveryPerson: "",
  });

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setProducts((prev) => [...prev, formData]);
    setFormData({
      productName: "",
      orderId: "",
      destination: "",
      warehouse: "",
      deliveryPerson: "",
    });
    toast.success("Product added successfully");
  };

  return (
    <DashboardLayout
      title="Admin Dashboard"
      navItems={navItems}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminStats.map((stat) => (
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
            placeholder="Order ID"
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
            className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 md:col-span-2"
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-2 font-semibold text-white md:col-span-2"
          >
            Add Product
          </button>
        </form>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2 text-left">Product Name</th>
              <th className="px-3 py-2 text-left">Order ID</th>
              <th className="px-3 py-2 text-left">Destination</th>
              <th className="px-3 py-2 text-left">Warehouse</th>
              <th className="px-3 py-2 text-left">Delivery Person</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr
                key={`${product.orderId}-${index}`}
                className="border-t border-slate-200 dark:border-slate-700"
              >
                <td className="px-3 py-2">{product.productName}</td>
                <td className="px-3 py-2">{product.orderId}</td>
                <td className="px-3 py-2">{product.destination}</td>
                <td className="px-3 py-2">{product.warehouse}</td>
                <td className="px-3 py-2">{product.deliveryPerson}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardLayout>
  );
}

export default AdminDashboard;
