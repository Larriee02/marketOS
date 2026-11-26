import { Temporal } from '@js-temporal/polyfill';

export function shopToday(timeZone) {
  return Temporal.Now.plainDateISO(timeZone).toString();
}

export function shopMidnight(date, timeZone, days = 0) {
  return Temporal.PlainDate.from(date).add({ days }).toZonedDateTime(timeZone).epochMilliseconds;
}
