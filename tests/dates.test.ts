import { describe, expect, it } from "vitest";
import { readClock } from "../src/lib/clock";
import {
  addDays,
  dateFromQuery,
  daysBetween,
  formatFull,
  formatLong,
  formatRange,
  formatShort,
  formatTime,
  isIsoDate,
  mondayOf,
  todayIn,
  weekday,
} from "../src/lib/dates";

describe("isIsoDate", () => {
  it("accepts real dates", () => {
    expect(isIsoDate("2027-01-12")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
  });
  it("rejects dates that do not exist and other shapes", () => {
    expect(isIsoDate("2027-02-29")).toBe(false);
    expect(isIsoDate("2027-13-01")).toBe(false);
    expect(isIsoDate("2027-1-12")).toBe(false);
    expect(isIsoDate("Jan 12")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });
});

describe("arithmetic", () => {
  it("knows the weekday", () => {
    expect(weekday("2027-01-12")).toBe(2); // Tuesday
    expect(weekday("2027-01-14")).toBe(4); // Thursday
    expect(weekday("2027-01-17")).toBe(0); // Sunday
  });
  it("finds the Monday of a week", () => {
    expect(mondayOf("2027-01-12")).toBe("2027-01-11");
    expect(mondayOf("2027-01-11")).toBe("2027-01-11");
    expect(mondayOf("2027-01-17")).toBe("2027-01-11");
  });
  it("adds days across months, years and the spring clock change", () => {
    expect(addDays("2027-01-31", 1)).toBe("2027-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-13", 2)).toBe("2027-03-15");
    expect(daysBetween("2027-03-08", "2027-03-16")).toBe(8);
  });
});

describe("formatting", () => {
  it("writes dates the way the site shows them", () => {
    expect(formatLong("2027-01-12")).toBe("Tuesday, January 12");
    expect(formatFull("2027-01-12")).toBe("Tuesday, January 12, 2027");
    expect(formatShort("2027-01-12")).toBe("Tue Jan 12");
    expect(formatRange("2027-03-08", "2027-03-12")).toBe("March 8–12");
    expect(formatRange("2027-03-29", "2027-04-02")).toBe("March 29 – April 2");
    expect(formatTime("21:00")).toBe("9 p.m.");
    expect(formatTime("09:30")).toBe("9:30 a.m.");
  });
});

describe("todayIn", () => {
  it("uses the course time zone, not UTC", () => {
    // 03:30 UTC on January 12 is still the evening of January 11 in New York.
    expect(todayIn("America/New_York", new Date("2027-01-12T03:30:00Z"))).toBe("2027-01-11");
    expect(todayIn("America/New_York", new Date("2027-01-12T05:00:00Z"))).toBe("2027-01-12");
    // Daylight time: midnight in New York is 04:00 UTC.
    expect(todayIn("America/New_York", new Date("2027-04-29T03:59:00Z"))).toBe("2027-04-28");
    expect(todayIn("America/New_York", new Date("2027-04-29T04:00:00Z"))).toBe("2027-04-29");
  });
});

describe("?date= override", () => {
  it("reads a real date from the query string", () => {
    expect(dateFromQuery("?date=2027-02-09")).toBe("2027-02-09");
    expect(dateFromQuery("?x=1&date=2027-02-09")).toBe("2027-02-09");
  });
  it("ignores a missing or impossible date", () => {
    expect(dateFromQuery("")).toBeNull();
    expect(dateFromQuery("?date=2027-02-30")).toBeNull();
    expect(dateFromQuery("?date=next-week")).toBeNull();
  });
  it("overrides the clock, and falls back to the clock when the date is bad", () => {
    const now = new Date("2026-11-10T17:00:00Z");
    expect(readClock("America/New_York", "?date=2027-02-09", now)).toEqual({ today: "2027-02-09", preview: true, invalid: false });
    expect(readClock("America/New_York", "", now)).toEqual({ today: "2026-11-10", preview: false, invalid: false });
    expect(readClock("America/New_York", "?date=nope", now)).toEqual({ today: "2026-11-10", preview: false, invalid: true });
  });
});
