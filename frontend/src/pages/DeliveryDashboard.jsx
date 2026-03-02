import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import VoicePanel from "../components/VoicePanel";
import { deliveryList, deliveryStats } from "../data/mockData";
import { processDeliveryVoiceCommand } from "../utils/voiceCommands";

// Delivery dashboard with status tracking and fake voice panel.
function DeliveryDashboard({ theme, onToggleTheme }) {
  const navItems = [
    { label: "Dashboard", path: "/delivery" },
    { label: "My Deliveries", path: "/delivery" },
    { label: "Route", path: "/delivery" },
  ];

  const [deliveries, setDeliveries] = useState(deliveryList);

  const dynamicStats = useMemo(() => {
    const completed = deliveries.filter(
      (delivery) => delivery.status === "Completed",
    ).length;
    const pending = deliveries.filter(
      (delivery) => delivery.status === "Pending",
    ).length;

    return [
      { ...deliveryStats[0], value: deliveries.length },
      { ...deliveryStats[1], value: completed },
      { ...deliveryStats[2], value: pending },
    ];
  }, [deliveries]);

  const markAsDelivered = (orderId, options = {}) => {
    const { fromVoice = false } = options;

    setDeliveries((prev) =>
      prev.map((delivery) =>
        delivery.orderId === orderId
          ? { ...delivery, status: "Completed" }
          : delivery,
      ),
    );

    if (fromVoice) {
      toast.success(`Voice: order ${orderId} marked delivered`);
    } else {
      toast.success(`Order ${orderId} marked as delivered`);
    }
  };

  const handleVoiceCommand = (command) => {
    return processDeliveryVoiceCommand({
      command,
      deliveries,
      onMarkDelivered: markAsDelivered,
    });
  };

  return (
    <DashboardLayout
      title="Delivery Dashboard"
      navItems={navItems}
      theme={theme}
      onToggleTheme={onToggleTheme}
    >
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dynamicStats.map((stat) => (
          <StatCard key={stat.label} title={stat.label} value={stat.value} />
        ))}
      </section>

      <section className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2 text-left">Order ID</th>
              <th className="px-3 py-2 text-left">Destination</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr
                key={delivery.orderId}
                className="border-t border-slate-200 dark:border-slate-700"
              >
                <td className="px-3 py-2">{delivery.orderId}</td>
                <td className="px-3 py-2">{delivery.destination}</td>
                <td className="px-3 py-2">{delivery.status}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={delivery.status === "Completed"}
                    onClick={() => markAsDelivered(delivery.orderId)}
                    className="rounded-lg bg-blue-600 px-3 py-1 text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Mark as Delivered
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <VoicePanel
        title="Delivery Voice Assistant"
        onProcessCommand={handleVoiceCommand}
        idleHint="Try: What is my next delivery, Mark order ORD-1001 delivered, Show pending orders, Track order ORD-1005"
      />
    </DashboardLayout>
  );
}

export default DeliveryDashboard;
