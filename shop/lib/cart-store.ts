export type CartLine = {
  key: string;
  productId: number;
  title: string;
  price: string;
  image: string | null;
  quantity: number;
  size?: string;
  color?: string;
  colorHex?: string;
};

export type CartLineInput = Omit<CartLine, "key" | "quantity"> & {
  quantity?: number;
};

const storageKey = "mayastore.cart.v1";
const emptyCart: CartLine[] = [];
const listeners = new Set<() => void>();
let cartSnapshot = emptyCart;
let initialized = false;

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const line = value as Partial<CartLine>;

  return (
    typeof line.key === "string" &&
    typeof line.productId === "number" &&
    typeof line.title === "string" &&
    typeof line.price === "string" &&
    (typeof line.image === "string" || line.image === null) &&
    Number.isInteger(line.quantity) &&
    (line.quantity ?? 0) > 0 &&
    (line.size === undefined || typeof line.size === "string") &&
    (line.color === undefined || typeof line.color === "string") &&
    (line.colorHex === undefined || typeof line.colorHex === "string")
  );
}

function readStorage(): CartLine[] {
  try {
    const value = window.localStorage.getItem(storageKey);
    const parsed: unknown = value ? JSON.parse(value) : emptyCart;

    return Array.isArray(parsed) ? parsed.filter(isCartLine) : emptyCart;
  } catch {
    return emptyCart;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function syncFromStorage() {
  cartSnapshot = readStorage();
  initialized = true;
  notify();
}

function handleStorage(event: StorageEvent) {
  if (event.key === storageKey || event.key === null) {
    syncFromStorage();
  }
}

export function subscribeToCart(listener: () => void) {
  listeners.add(listener);

  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

export function getCartSnapshot(): CartLine[] {
  if (typeof window === "undefined") {
    return emptyCart;
  }

  if (!initialized) {
    cartSnapshot = readStorage();
    initialized = true;
  }

  return cartSnapshot;
}

export function getServerCartSnapshot(): CartLine[] {
  return emptyCart;
}

export function getCartCountSnapshot(): number {
  return getCartSnapshot().reduce((count, line) => count + line.quantity, 0);
}

export function getServerCartCountSnapshot(): number {
  return 0;
}

function saveCart(lines: CartLine[]): boolean {
  cartSnapshot = lines;
  initialized = true;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(lines));
    notify();
    return true;
  } catch {
    notify();
    return false;
  }
}

export function addToCart(input: CartLineInput): boolean {
  const key = JSON.stringify([
    input.productId,
    input.size ?? null,
    input.colorHex ?? input.color ?? null,
  ]);
  const addedQuantity =
    Number.isSafeInteger(input.quantity) && (input.quantity ?? 0) > 0
      ? input.quantity!
      : 1;
  const lines = getCartSnapshot();
  const existing = lines.find((line) => line.key === key);

  if (existing) {
    return saveCart(
      lines.map((line) =>
        line.key === key
          ? { ...line, quantity: line.quantity + addedQuantity }
          : line,
      ),
    );
  }

  return saveCart([...lines, { ...input, key, quantity: addedQuantity }]);
}

export function setCartQuantity(key: string, quantity: number) {
  const lines = getCartSnapshot();

  if (quantity <= 0) {
    return saveCart(lines.filter((line) => line.key !== key));
  }

  return saveCart(
    lines.map((line) => (line.key === key ? { ...line, quantity } : line)),
  );
}

export function removeFromCart(key: string) {
  return saveCart(getCartSnapshot().filter((line) => line.key !== key));
}

export function clearCart() {
  return saveCart(emptyCart);
}
