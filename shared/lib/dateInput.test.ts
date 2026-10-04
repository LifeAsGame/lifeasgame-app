import { expect, it } from "vitest";
import { validCalendarDate, validDateInput } from "./dateInput";

it("accepts real Gregorian dates only in years 0001–9999", () => {
  for (const date of ["0001-01-01", "2000-02-29", "9999-12-31", "2027-01-01"]) expect(validCalendarDate(date)).toBe(true);
  for (const date of ["0000-01-01", "-001-01-01", "10000-01-01", "1900-02-29", "2026-04-31", "2026-13-01", "2026-1-01"]) expect(validCalendarDate(date)).toBe(false);
});

it("validates datetime-local without blocking future events", () => {
  expect(validDateInput("2027-02-28T23:59", "datetime-local")).toBe(true);
  expect(validDateInput("2028-02-29T12:00:00", "datetime-local")).toBe(true);
  for (const date of ["10000-01-01T12:00", "2027-02-29T12:00", "2027-01-01T24:00", "2027-01-01T11:60"]) expect(validDateInput(date, "datetime-local")).toBe(false);
});

it("enforces narrower MySQL date boundaries without restricting profile dates", () => {
  expect(validDateInput("0001-01-01", "date")).toBe(true);
  expect(validDateInput("0999-12-31", "date", "1000-01-01")).toBe(false);
  expect(validDateInput("1000-01-01", "date", "1000-01-01")).toBe(true);
  expect(validDateInput("2027-01-01T12:00", "datetime-local", "1000-01-01T00:00")).toBe(true);
  expect(validDateInput("0999-12-31T23:59", "datetime-local", "1000-01-01T00:00")).toBe(false);
});
