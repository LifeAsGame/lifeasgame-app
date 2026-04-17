export function upperCenterIndex(length: number) {
  if (length <= 0) {
    return 0;
  }

  // For even counts, use the slot just above the visual center.
  return Math.floor((length - 1) / 2);
}

export function reorderToCenter<T>(
  items: readonly T[],
  selectedKey: string | null | undefined,
  getKey: (item: T) => string,
): T[] {
  if (!items.length || !selectedKey) {
    return [...items];
  }

  const selectedIndex = items.findIndex((item) => getKey(item) === selectedKey);
  if (selectedIndex < 0) {
    return [...items];
  }

  const targetIndex = Math.min(items.length - 1, upperCenterIndex(items.length));
  if (selectedIndex === targetIndex) {
    return [...items];
  }

  const selectedItem = items[selectedIndex];
  const remaining = items.filter((_, index) => index !== selectedIndex);

  return [
    ...remaining.slice(0, targetIndex),
    selectedItem,
    ...remaining.slice(targetIndex),
  ];
}

export function bringToFrontStable<T>(
  items: readonly T[],
  selectedKey: string | null | undefined,
  getKey: (item: T) => string,
): T[] {
  if (!items.length || !selectedKey) {
    return [...items];
  }

  const selectedIndex = items.findIndex((item) => getKey(item) === selectedKey);
  if (selectedIndex <= 0) {
    return [...items];
  }

  const selectedItem = items[selectedIndex];
  const remaining = items.filter((_, index) => index !== selectedIndex);
  return [selectedItem, ...remaining];
}
