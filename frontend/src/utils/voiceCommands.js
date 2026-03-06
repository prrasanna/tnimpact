// Voice command parsing and role-specific response helpers.

const bilingual = (ta, en) => `${ta}\n${en}`;

const askClarification = () =>
  bilingual(
    "சரி, கொஞ்சம் தெளிவாக சொல்லுங்க — நான் உடனே உதவுகிறேன்.",
    "Sure, please tell me a little more clearly — I’ll help right away.",
  );

const extractOrderId = (command) => {
  const normalized = command.replace(/\s+/g, " ").trim();

  // Handles formats like: ORD-1003, ORD1003, ord 1003, order 1003, 1003.
  const match = normalized.match(
    /(ORD\s*-?\s*\d+|order\s*(id|number|no)?\s*-?\s*\d+|\b\d{2,}\b)/i,
  );
  if (!match) {
    return null;
  }

  const token = match[1].toUpperCase();
  const digits = token.match(/\d+/)?.[0];
  if (!digits) {
    return null;
  }

  return `ORD-${digits}`;
};

const hasAny = (text, terms) => terms.some((term) => text.includes(term));

const isPackingIntent = (text) =>
  hasAny(text, [
    "pack",
    "packed",
    "mark as packed",
    "mark packed",
    "ready",
    "mark as ready",
    "ready pannunga",
    "pack pannunga",
    "packed aagiduchu",
    "packed aagiduchi",
    "packed aachu",
    "packing mudinjudhu",
    "packing complete",
    "set packed",
  ]);

const isDeliveredIntent = (text) =>
  hasAny(text, [
    "delivered",
    "deliver",
    "mark delivered",
    "mark as delivered",
    "complete delivery",
    "delivery complete",
    "delivery done",
    "delivery mudinjiduchu",
    "delivery mudinjudhu",
    "delivered aagiduchu",
    "delivered aachu",
    "deliver panniten",
    "delivery panniten",
    "delivered pannunga",
    "set delivered",
    "done delivery",
  ]);

const isStatusIntent = (text) =>
  hasAny(text, [
    "track",
    "status",
    "order status",
    "where is order",
    "engirukku",
    "enga iruku",
    "எங்கே இருக்கு",
  ]);

const isAssignedCountIntent = (text) =>
  hasAny(text, [
    "evlo product",
    "how many product",
    "how many products",
    "how many orders",
    "assigned count",
    "enaku evlo",
    "assigned aagidhu",
  ]);

const isAssignedListIntent = (text) =>
  hasAny(text, [
    "enna enna products",
    "what products",
    "which products",
    "show my orders",
    "my orders",
    "assigned products",
    "orders vandhiruku",
  ]);

const buildWarehouseAssignmentResponse = (orders) => {
  if (!orders.length) {
    return bilingual(
      "இப்போ உங்களுக்கு எந்த products-மும் assign ஆகலை.",
      "You currently don’t have any assigned products.",
    );
  }

  const itemNames = orders.map((order) => order.item).join(", ");
  return bilingual(
    `இன்னைக்கு உங்களுக்கு ${orders.length} products assign ஆகி இருக்கு. ${itemNames}.`,
    `You have ${orders.length} products assigned today: ${itemNames}.`,
  );
};

const isNextStopIntent = (text) =>
  hasAny(text, [
    "next stop",
    "next delivery",
    "my next delivery",
    "what is my next delivery",
    "next order",
    "adutha delivery",
    "adutha stop",
  ]);

const isRouteIntent = (text) =>
  hasAny(text, ["route", "navigation", "navigate", "way", "vazhi"]);

const isPendingIntent = (text) =>
  hasAny(text, [
    "show pending",
    "pending orders",
    "list pending",
    "pending delivery",
  ]);

const isCallCustomerIntent = (text) =>
  hasAny(text, [
    "call customer",
    "customer call",
    "customer ku call",
    "call pannunga",
    "phone pannunga",
    "contact customer",
  ]);

const resolveDeliveryOrder = (command, deliveries) => {
  const explicitOrderId = extractOrderId(command);
  if (explicitOrderId) {
    const explicitTarget = deliveries.find(
      (delivery) => delivery.orderId === explicitOrderId,
    );
    return {
      orderId: explicitOrderId,
      target: explicitTarget,
      source: "explicit",
    };
  }

  const pendingOrders = deliveries.filter(
    (delivery) => delivery.status === "Pending",
  );
  if (pendingOrders.length === 1) {
    return {
      orderId: pendingOrders[0].orderId,
      target: pendingOrders[0],
      source: "inferred",
    };
  }

  return { orderId: null, target: null, source: "missing" };
};

const handleGeneralTopic = (text) => {
  if (
    hasAny(text, [
      "hi",
      "hello",
      "hey",
      "vanakkam",
      "வணக்கம்",
      "good morning",
      "good evening",
    ])
  ) {
    return bilingual(
      `வணக்கம்! ${user_name} நான் ரெடி, என்ன உதவி வேண்டும் சொல்லுங்க.`,
      `Hello! ${user_name} I’m ready, tell me how I can help.`,
    );
  }

  if (hasAny(text, ["how are you", "epdi iruka", "எப்படி இருக்கீங்க"])) {
    return bilingual(
      "நான் நல்லா இருக்கேன், நீங்க சொல்லுங்க என்ன செய்யணும்.",
      "I’m doing great, tell me what you need me to do.",
    );
  }

  if (hasAny(text, ["time", "time now", "என்ன நேரம்", "neram"])) {
    const now = new Date();
    const time = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return bilingual(`இப்போ நேரம் ${time}.`, `The current time is ${time}.`);
  }

  if (
    hasAny(text, ["joke", "fun", "sirippu", "சிரிப்பு", "காமெடி", "comedy"])
  ) {
    return bilingual(
      "ஒரு சின்ன ஜோக்: லாஜிஸ்டிக்ஸ் டிரைவர் GPS-ஐ கல்யாணம் பண்ணிக்கிட்டாராம் — எப்பவும் ‘right turn’ தான்!",
      "Here’s a quick joke: The logistics driver married GPS — because it always says ‘you are on the right path’!",
    );
  }

  if (text.trim().length < 3) {
    return askClarification();
  }

  return bilingual(
    "சரி, இந்த விஷயத்துக்கு உதவலாம். கொஞ்சம் டீடெய்லா சொல்லுங்க, சரியாக பதில் சொல்றேன்.",
    "Sure, I can help with that. Share a bit more detail and I’ll answer properly.",
  );
};

export const processDeliveryVoiceCommand = ({
  command,
  deliveries,
  onMarkDelivered,
}) => {
  const text = command.toLowerCase();

  if (isNextStopIntent(text)) {
    const nextOrder = deliveries.find(
      (delivery) => delivery.status === "Pending",
    );
    if (!nextOrder) {
      return bilingual(
        "இப்போ உங்களுக்கு pending delivery இல்லை.",
        "You have no pending deliveries right now.",
      );
    }

    return bilingual(
      `உங்க அடுத்த delivery ${nextOrder.orderId}, destination ${nextOrder.destination}.`,
      `Your next delivery is ${nextOrder.orderId} to ${nextOrder.destination}.`,
    );
  }

  if (isDeliveredIntent(text)) {
    const { orderId, target, source } = resolveDeliveryOrder(
      command,
      deliveries,
    );
    if (!orderId) {
      return bilingual(
        "எந்த order delivered பண்ணணும் என்று தெளிவா order number சொல்லுங்க.",
        "Please clearly tell the order number to mark as delivered.",
      );
    }

    if (!target) {
      return bilingual(
        `Order ${orderId} உங்க delivery list-ல கிடைக்கலை.`,
        `Order ${orderId} was not found in your delivery list.`,
      );
    }

    if (target.status === "Completed") {
      return bilingual(
        `Order ${orderId} ஏற்கனவே delivered ஆகிவிட்டது.`,
        `Order ${orderId} is already delivered.`,
      );
    }

    onMarkDelivered(orderId, { fromVoice: true });

    if (source === "inferred") {
      return bilingual(
        `சரி. ஒரே pending order இருந்ததால Order ${orderId} delivered ஆக update பண்ணிட்டேன். Safe-ஆ drive பண்ணுங்க.`,
        `Okay. Since only one pending order was available, I marked Order ${orderId} as delivered. Drive safely.`,
      );
    }

    return bilingual(
      `சரி. Order ${orderId} successful-ஆ delivered ஆகிடுச்சு.  பாதுகாப்பு-ஆ drive பண்ணுங்க.`,
      `Okay. Order ${orderId} has been successfully delivered. Drive safely.`,
    );
  }

  if (isPendingIntent(text)) {
    const pendingOrders = deliveries.filter(
      (delivery) => delivery.status === "Pending",
    );
    if (!pendingOrders.length) {
      return bilingual(
        "Pending deliveries ஏதும் இல்லை.",
        "There are no pending deliveries.",
      );
    }

    const orderList = pendingOrders
      .map((delivery) => delivery.orderId)
      .join(", ");
    return bilingual(
      `உங்களுக்கு ${pendingOrders.length} pending deliveries இருக்கு: ${orderList}.`,
      `You have ${pendingOrders.length} pending deliveries: ${orderList}.`,
    );
  }

  if (isRouteIntent(text)) {
    const nextOrder = deliveries.find(
      (delivery) => delivery.status === "Pending",
    );
    if (!nextOrder) {
      return bilingual(
        "இப்போ active route இல்லை. எல்லா deliveries-யும் complete ஆகிவிட்டது.",
        "There is no active route right now. All deliveries are completed.",
      );
    }

    return bilingual(
      `Route ready. அடுத்து ${nextOrder.destination} க்கு போங்க, order ${nextOrder.orderId} deliver பண்ணலாம்.`,
      `Route is ready. Next, go to ${nextOrder.destination} and deliver order ${nextOrder.orderId}.`,
    );
  }

  if (isCallCustomerIntent(text)) {
    const { orderId, target } = resolveDeliveryOrder(command, deliveries);
    if (!orderId || !target) {
      return bilingual(
        "Customer-ஐ call பண்ண order number சொல்லுங்க.",
        "Please provide the order number to call the customer.",
      );
    }

    return bilingual(
      `சரி, order ${orderId} customer-ஐ contact பண்ண நினைவூட்டு வச்சுட்டேன்.`,
      `Sure, I’ve set a reminder to contact the customer for order ${orderId}.`,
    );
  }

  if (isStatusIntent(text)) {
    const orderId = extractOrderId(command);
    if (!orderId) {
      return bilingual(
        "Track செய்ய order ID சொல்லுங்க.",
        "Please provide an order ID to track.",
      );
    }

    const target = deliveries.find((delivery) => delivery.orderId === orderId);
    if (!target) {
      return bilingual(
        `Order ${orderId} கிடைக்கலை.`,
        `Order ${orderId} was not found.`,
      );
    }

    return bilingual(
      `Order ${orderId} இப்போ ${target.status} நிலையில் இருக்கு, destination ${target.destination}.`,
      `Order ${orderId} is currently ${target.status} for destination ${target.destination}.`,
    );
  }

  return handleGeneralTopic(text);
};

export const processWarehouseVoiceCommand = ({
  command,
  orders,
  onMarkPacked,
}) => {
  const text = command.toLowerCase();

  if (isAssignedCountIntent(text)) {
    if (!orders.length) {
      return bilingual(
        "இப்போ உங்களுக்கு assigned products இல்லை.",
        "You don’t have any assigned products right now.",
      );
    }

    return bilingual(
      `உங்களுக்கு மொத்தம் ${orders.length} products assign ஆகி இருக்கு.`,
      `You have a total of ${orders.length} assigned products.`,
    );
  }

  if (isAssignedListIntent(text)) {
    return buildWarehouseAssignmentResponse(orders);
  }

  if (hasAny(text, ["next pick order", "next order", "adutha order"])) {
    const nextOrder = orders.find((order) => order.status === "Pending Pick");
    if (!nextOrder) {
      return bilingual(
        "உங்களுக்கு assign ஆன warehouse orders எல்லாம் packed ஆகிவிட்டது.",
        "All assigned warehouse orders are already packed.",
      );
    }

    return bilingual(
      `உங்க அடுத்த pick order ${nextOrder.orderId}, item ${nextOrder.item}.`,
      `Your next pick order is ${nextOrder.orderId} for ${nextOrder.item}.`,
    );
  }

  if (isPackingIntent(text)) {
    const orderId = extractOrderId(command);
    if (!orderId) {
      return bilingual(
        "Order number கேட்கலை, தயவு செய்து order number-ஐ மறுபடியும் சொல்லுங்க.",
        "I couldn’t catch the order number. Please say the order number again.",
      );
    }

    const target = orders.find((order) => order.orderId === orderId);
    if (!target) {
      return bilingual(
        `Order ${orderId} warehouse list-ல கிடைக்கலை.`,
        `Order ${orderId} was not found in warehouse orders.`,
      );
    }

    if (target.status === "Packed") {
      return bilingual(
        `Order ${orderId} ஏற்கனவே packed ஆகிவிட்டது.`,
        `Order ${orderId} is already packed.`,
      );
    }

    onMarkPacked(orderId, { fromVoice: true });
    return bilingual(
      `சரி. Order ${orderId} வெற்றிகரமாக-ஆ packed ஆகிடுச்சு. வேற ஏதாவது உதவி வேண்டுமா?`,
      `Okay. Order ${orderId} has been successfully marked as packed. Do you need anything else?`,
    );
  }

  if (hasAny(text, ["show pending", "pending orders", "pending pick"])) {
    const pendingOrders = orders.filter(
      (order) => order.status === "Pending Pick",
    );
    if (!pendingOrders.length) {
      return bilingual(
        "Pending pick orders ஏதும் இல்லை.",
        "There are no pending pick orders.",
      );
    }

    const orderList = pendingOrders.map((order) => order.orderId).join(", ");
    return bilingual(
      `உங்களுக்கு ${pendingOrders.length} pending pick orders இருக்கு: ${orderList}.`,
      `You have ${pendingOrders.length} pending pick orders: ${orderList}.`,
    );
  }

  if (isStatusIntent(text)) {
    const orderId = extractOrderId(command);
    if (!orderId) {
      return bilingual(
        "Track பண்ண order number சொல்லுங்க.",
        "Please provide an order number to track.",
      );
    }

    const target = orders.find((order) => order.orderId === orderId);
    if (!target) {
      return bilingual(
        `Order ${orderId} கிடைக்கலை.`,
        `Order ${orderId} was not found.`,
      );
    }

    return bilingual(
      `Order ${orderId} இப்போ ${target.status} நிலையில் இருக்கு.`,
      `Order ${orderId} is currently ${target.status}.`,
    );
  }

  return handleGeneralTopic(text);
};

export const getWarehouseAutoAnnouncement = (orders) => {
  return buildWarehouseAssignmentResponse(orders);
};
