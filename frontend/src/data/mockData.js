// Mock JSON data for dashboard cards and tables.
export const adminStats = [
  { label: "Total Orders", value: 1248 },
  { label: "Pending Deliveries", value: 89 },
  { label: "Active Drivers", value: 42 },
];

export const initialProducts = [
  {
    productName: "Medical Supplies Kit",
    orderId: "ORD-1001",
    destination: "Chennai",
    warehouse: "Warehouse A",
    deliveryPerson: "Arun Kumar",
  },
  {
    productName: "Electronics Package",
    orderId: "ORD-1002",
    destination: "Coimbatore",
    warehouse: "Warehouse B",
    deliveryPerson: "Meena R",
  },
];

export const warehouseOrders = [
  { orderId: "ORD-1001", item: "Medical Supplies Kit", status: "Pending Pick" },
  { orderId: "ORD-1003", item: "Food Parcel Box", status: "Pending Pick" },
  { orderId: "ORD-1004", item: "Industrial Tools", status: "Packed" },
];

export const deliveryStats = [
  { label: "Today’s Deliveries", value: 18 },
  { label: "Completed", value: 11 },
  { label: "Pending", value: 7 },
];

export const deliveryList = [
  { orderId: "ORD-1001", destination: "Chennai", status: "Pending" },
  { orderId: "ORD-1002", destination: "Madurai", status: "Completed" },
  { orderId: "ORD-1005", destination: "Trichy", status: "Pending" },
];
