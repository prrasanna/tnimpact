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
  {
    orderId: "ORD-1001",
    item: "Medical Supplies Kit",
    deliveryPersonName: "Arun Kumar",
    deliveryPersonPhone: "+91 98765 43210",
    status: "Pending Pick",
  },
  {
    orderId: "ORD-1003",
    item: "Food Parcel Box",
    deliveryPersonName: "Meena R",
    deliveryPersonPhone: "+91 91234 56780",
    status: "Pending Pick",
  },
  {
    orderId: "ORD-1004",
    item: "Industrial Tools",
    deliveryPersonName: "Dinesh V",
    deliveryPersonPhone: "+91 90011 22334",
    status: "Packed",
  },
];

export const deliveryStats = [
  { label: "Today’s Deliveries", value: 18 },
  { label: "Completed", value: 11 },
  { label: "Pending", value: 7 },
];

export const deliveryList = [
  {
    orderId: "ORD-1001",
    itemName: "Medical Supplies Kit",
    destination: "Chennai",
    customerPhone: "+91 98765 43210",
    status: "Pending",
  },
  {
    orderId: "ORD-1002",
    itemName: "Diagnostic Sensor Pack",
    destination: "Madurai",
    customerPhone: "+91 91234 56780",
    status: "Completed",
  },
  {
    orderId: "ORD-1005",
    itemName: "Cold Chain Vaccine Box",
    destination: "Trichy",
    customerPhone: "+91 90011 22334",
    status: "Pending",
  },
];
