import {
  ClipboardList,
  CircleCheck,
  PackageSearch,
  Warehouse,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import VoicePanel from "../components/VoicePanel";
import { warehouseOrders } from "../data/mockData";
import { getCurrentUser } from "../utils/auth";
import {
  getWarehouseAutoAnnouncement,
  processWarehouseVoiceCommand,
} from "../utils/voiceCommands";

// Warehouse dashboard with pick list flow.
function WarehouseDashboard({ theme, onToggleTheme }) {
  const hasAnnouncedRef = useRef(false);
  const currentUser = getCurrentUser();
  const warehouseOrderTemplateByOrderId = useMemo(
    () =>
      warehouseOrders.reduce((accumulator, order) => {
        accumulator[order.orderId] = order;
        return accumulator;
      }, {}),
    [],
  );

  const getWarehouseStorageKey = (email) =>
    `vla_warehouse_data_${(email || "guest").toLowerCase()}`;

  const createInitialOrders = () =>
    warehouseOrders.map((order) => ({ ...order }));

  const normalizeOrders = (items) =>
    items.map((order) => {
      const template = warehouseOrderTemplateByOrderId[order.orderId] || {};
      return { ...template, ...order };
    });

  const navItems = [
    { label: "Dashboard", path: "/warehouse" },
    { label: "Pick List", path: "/warehouse" },
    { label: "Inventory", path: "/warehouse" },
    { label: "Settings", path: "/warehouse" },
  ];

  const [orders, setOrders] = useState(() => {
    const storageKey = getWarehouseStorageKey(currentUser?.email);
    const savedOrders = localStorage.getItem(storageKey);

    if (!savedOrders) {
      return createInitialOrders();
    }

    try {
      const parsed = JSON.parse(savedOrders);
      return Array.isArray(parsed)
        ? normalizeOrders(parsed)
        : createInitialOrders();
    } catch {
      return createInitialOrders();
    }
  });

  useEffect(() => {
    const storageKey = getWarehouseStorageKey(currentUser?.email);
    localStorage.setItem(storageKey, JSON.stringify(orders));
  }, [currentUser?.email, orders]);

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status === "Pending Pick").length,
    [orders],
  );

  const packedCount = useMemo(
    () => orders.filter((order) => order.status === "Packed").length,
    [orders],
  );

  const markAsPacked = (orderId, options = {}) => {
    const { fromVoice = false } = options;

    setOrders((prev) =>
      prev.map((order) =>
        order.orderId === orderId ? { ...order, status: "Packed" } : order,
      ),
    );

    if (fromVoice) {
      toast.success(`Voice: order ${orderId} marked packed`);
    } else {
      toast.success(`Order ${orderId} marked as packed`);
    }
  };

  const handleVoiceCommand = (command) => {
    return processWarehouseVoiceCommand({
      command,
      orders,
      onMarkPacked: markAsPacked,
    });
  };

  useEffect(() => {
    if (hasAnnouncedRef.current) {
      return;
    }

    const announcement = getWarehouseAutoAnnouncement(orders);
    toast.success("Warehouse voice assistant is ready");

    if (!window.speechSynthesis) {
      hasAnnouncedRef.current = true;
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    const pickVoice = (lang) => {
      const exact = voices.find(
        (voice) => voice.lang?.toLowerCase() === lang.toLowerCase(),
      );
      if (exact) {
        return exact;
      }

      const base = lang.split("-")[0].toLowerCase();
      return voices.find((voice) => voice.lang?.toLowerCase().startsWith(base));
    };

    const [taLine, enLine] = announcement
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!taLine || !enLine) {
      hasAnnouncedRef.current = true;
      return;
    }

    window.speechSynthesis.cancel();

    const taUtterance = new SpeechSynthesisUtterance(taLine);
    taUtterance.lang = "ta-IN";
    const taVoice = pickVoice("ta-IN");
    if (taVoice) {
      taUtterance.voice = taVoice;
    }

    const enUtterance = new SpeechSynthesisUtterance(enLine);
    enUtterance.lang = "en-IN";
    const enVoice = pickVoice("en-IN");
    if (enVoice) {
      enUtterance.voice = enVoice;
    }

    taUtterance.onend = () => {
      window.speechSynthesis.speak(enUtterance);
    };

    window.speechSynthesis.speak(taUtterance);
    hasAnnouncedRef.current = true;
  }, [orders]);

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
              <tr key={order.orderId} className="border-t border-slate-800">
                <td className="px-4 py-3 font-semibold text-cyan-300">
                  {order.orderId}
                </td>
                <td className="px-4 py-3 text-slate-200">{order.item}</td>
                <td className="px-4 py-3 text-slate-200">
                  {order.deliveryPersonName || "—"}
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {order.deliveryPersonPhone || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      order.status === "Packed"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={order.status === "Packed"}
                    onClick={() => markAsPacked(order.orderId)}
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
