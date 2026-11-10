// What day is it? Used by every page's browser script.
//
// Normally the answer is today's date in the course's time zone. Adding
// ?date=YYYY-MM-DD to any page's address overrides it, so any week can be
// previewed and tests can pin the date.

import { dateFromQuery, todayIn, type IsoDate } from "./dates";

export interface Clock {
  today: IsoDate;
  /** True when the date came from ?date= rather than the device clock. */
  preview: boolean;
  /** True when ?date= was present but was not a real date, and was ignored. */
  invalid: boolean;
}

export function readClock(timeZone: string, search: string, now: Date = new Date()): Clock {
  const asked = new URLSearchParams(search).has("date");
  const override = dateFromQuery(search);
  if (override) return { today: override, preview: true, invalid: false };
  return { today: todayIn(timeZone, now), preview: false, invalid: asked };
}
