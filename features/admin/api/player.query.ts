export function requirePositiveAdminPlayerId(value: number, field: "userId" | "playerId") {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${field} must be a positive integer.`);
  return value;
}
