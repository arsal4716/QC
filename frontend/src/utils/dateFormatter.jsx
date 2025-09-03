import { DateTime } from 'luxon';

export function formatRingbaDate(date) {
  if (!date) return '';

  try {
    let base;
    if (typeof date === 'string') base = DateTime.fromISO(date, { zone: 'utc' });
    else if (typeof date === 'number') base = DateTime.fromMillis(date, { zone: 'utc' });
    else if (date instanceof Date) base = DateTime.fromJSDate(date, { zone: 'utc' });
    else return '';

    if (!base.isValid) return '';

    return base.setZone('America/New_York').toFormat('MMM dd hh:mm:ss a');
  } catch (error) {
    console.error('Error formatting Ringba date:', error);
    return '';
  }
}
