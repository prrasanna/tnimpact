import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import VoicePanel from "../components/VoicePanel";
import { warehouseOrders } from "../data/mockData";
import {
  getWarehouseAutoAnnouncement,
  processWarehouseVoiceCommand,
} from "../utils/voiceCommands";

// Warehouse dashboard with pick list flow.
function WarehouseDashboard({ theme, onToggleTheme }) {
  const hasAnnouncedRef = useRef(false);

  const navItems = [
    { label: "Dashboard", path: "/warehouse" },
    { label: "Pick List", path: "/warehouse" },
    { label: "Inventory", path: "/warehouse" },
  ];

  const [orders, setOrders] = useState(warehouseOrders);

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

  return (
    <DashboardLayout
      title="Warehouse Dashboard"
      navItems={navItems}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pending Pick Orders
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Packed Orders
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
            {packedCount}
          </p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2 text-left">Order ID</th>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.orderId}
                className="border-t border-slate-200 dark:border-slate-700"
              >
                <td className="px-3 py-2">{order.orderId}</td>
                <td className="px-3 py-2">{order.item}</td>
                <td className="px-3 py-2">{order.status}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={order.status === "Packed"}
                    onClick={() => markAsPacked(order.orderId)}
                    className="rounded-lg bg-emerald-500 px-3 py-1 text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Mark as Packed
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <VoicePanel
          title="Warehouse Voice Assistant"
          onProcessCommand={handleVoiceCommand}
          idleHint="Try: Enaku evlo product assign aagidhu?, Enna enna products vandhiruku?, Show my orders, Mark order ORD-1003 packed"
        />
      </section>
    </DashboardLayout>
  );
}

export default WarehouseDashboard;
