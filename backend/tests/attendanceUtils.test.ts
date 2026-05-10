import { describe, expect, it } from "vitest";

import { formatAttendanceDate, normalizeAttendanceDateInput } from "../src/utils/attendance.js";

describe("normalizeAttendanceDateInput", () => {
  it("keeps YYYY-MM-DD input stable", () => {
    const normalized = normalizeAttendanceDateInput("2026-05-04");

    expect(formatAttendanceDate(normalized)).toBe("2026-05-04");
  });

  it("normalizes a Date object to the local calendar day", () => {
    const normalized = normalizeAttendanceDateInput(new Date(2026, 4, 4, 18, 45, 0));

    expect(normalized.getFullYear()).toBe(2026);
    expect(normalized.getMonth()).toBe(4);
    expect(normalized.getDate()).toBe(4);
    expect(normalized.getHours()).toBe(0);
  });

  it("rejects invalid date input", () => {
    expect(() => normalizeAttendanceDateInput("2026-02-31")).toThrow("Attendance date is invalid.");
  });
});
