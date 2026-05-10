export type ClassBand = "foundational" | "middle" | "secondary" | "senior-secondary";

export function normalizeClassLevel(input: string | number): number {
  if (typeof input === "number") {
    return input;
  }

  const parsed = Number(String(input).replace(/[^\d]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function resolveClassBand(classLevel: string | number): ClassBand {
  const value = normalizeClassLevel(classLevel);

  if (value <= 5) {
    return "foundational";
  }
  if (value <= 8) {
    return "middle";
  }
  if (value <= 10) {
    return "secondary";
  }
  return "senior-secondary";
}

