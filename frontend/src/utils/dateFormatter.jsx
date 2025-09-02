import { DateTime } from 'luxon';

export function formatRingbaDate(date) {
  if (!date) return '';

  let base;
  if (typeof date === 'string') base = DateTime.fromISO(date);
  else if (typeof date === 'number') base = DateTime.fromMillis(date);
  else base = DateTime.fromJSDate(date);

  if (!base.isValid) return '';

  return base.setZone('UTC-05:00').toFormat('MMM dd hh:mm:ss a');
}
