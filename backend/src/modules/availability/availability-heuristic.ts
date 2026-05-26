import { AvailabilityDayInput, TimeSlotInput, WEEKDAYS, Weekday } from '../profile/types/profile.types.js';

type TimeBand = { start: string; end: string };

const WEEKDAYS_WORK: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEKEND_DAYS: Weekday[] = ['saturday', 'sunday'];
const ALL_DAYS: Weekday[] = [...WEEKDAYS];

const TIME_BANDS: Record<string, TimeBand> = {
  morning: { start: '08:00', end: '12:00' },
  afternoon: { start: '14:00', end: '18:00' },
  evening: { start: '18:00', end: '22:00' },
  night: { start: '20:00', end: '23:00' },
  afterClasses: { start: '18:00', end: '22:00' },
  flexibleDay: { start: '09:00', end: '18:00' },
};

const DAY_ALIASES: Record<string, Weekday> = {
  monday: 'monday',
  lunes: 'monday',
  mon: 'monday',
  tuesday: 'tuesday',
  martes: 'tuesday',
  tue: 'tuesday',
  wednesday: 'wednesday',
  miercoles: 'wednesday',
  miércoles: 'wednesday',
  wed: 'wednesday',
  thursday: 'thursday',
  jueves: 'thursday',
  thu: 'thursday',
  friday: 'friday',
  viernes: 'friday',
  fri: 'friday',
  saturday: 'saturday',
  sabado: 'saturday',
  sábado: 'saturday',
  sat: 'saturday',
  sunday: 'sunday',
  domingo: 'sunday',
  sun: 'sunday',
};

const EXPLICIT_RANGE =
  /(\d{1,2})(?::(\d{2}))?\s*(?:-|a|to|hasta|until)\s*(\d{1,2})(?::(\d{2}))?/i;

const TWELVE_HOUR_RANGE =
  /(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)\s*(?:-|a|to|hasta|until)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)/i;

function maskMeridiemDots(text: string): string {
  return text
    .replace(/(\d{1,2}:\d{2})\s*p\.?\s*m\.?/gi, '$1 pm')
    .replace(/(\d{1,2}:\d{2})\s*a\.?\s*m\.?/gi, '$1 am');
}

function splitAvailabilitySegments(text: string): string[] {
  return maskMeridiemDots(text)
    .split(/[.;\n]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function to24Hour(hour: string, minute: string | undefined, meridiem: string): string {
  let h = Number(hour);
  const m = minute === undefined ? 0 : Number(minute);
  const normalizedMeridiem = meridiem.trim().toLowerCase();
  const isPm = normalizedMeridiem.startsWith('p') || normalizedMeridiem === 'pm';

  if (h < 1 || h > 12 || m < 0 || m > 59) {
    return '';
  }

  if (h === 12) {
    h = isPm ? 12 : 0;
  } else if (isPm) {
    h += 12;
  }

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function normalizeTime(hour: string, minute?: string): string {
  const h = Number(hour);
  const m = minute === undefined ? 0 : Number(minute);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function mergeSlots(
  byDay: Map<Weekday, TimeSlotInput[]>,
  day: Weekday,
  slots: TimeSlotInput[]
): void {
  const existing = byDay.get(day) ?? [];
  const keys = new Set(existing.map((s) => `${s.start}-${s.end}`));
  for (const slot of slots) {
    const key = `${slot.start}-${slot.end}`;
    if (!keys.has(key)) {
      existing.push(slot);
      keys.add(key);
    }
  }
  byDay.set(day, existing.sort((a, b) => a.start.localeCompare(b.start)));
}

function detectDays(text: string): Weekday[] {
  const t = text.toLowerCase();
  const days = new Set<Weekday>();

  if (
    /\b(weekdays?|d[ií]as?\s+laborables?|entre\s+semana|d[ií]as?\s+de\s+semana|lun(?:es)?\s*(?:a|-|hasta)\s*vier(?:nes)?)\b/i.test(
      t
    )
  ) {
    WEEKDAYS_WORK.forEach((d) => days.add(d));
  }

  if (/\b(weekends?|fin(?:es)?\s+de\s+semana|s[aá]bados?\s*y\s*domingos?)\b/i.test(t)) {
    WEEKEND_DAYS.forEach((d) => days.add(d));
  }

  for (const [alias, day] of Object.entries(DAY_ALIASES)) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(t)) {
      days.add(day);
    }
  }

  if (days.size === 0 && /\b(toda\s+la\s+semana|all\s+week|todos\s+los\s+d[ií]as)\b/i.test(t)) {
    ALL_DAYS.forEach((d) => days.add(d));
  }

  return [...days];
}

function detectTimeBands(text: string): TimeBand[] {
  const t = text.toLowerCase();
  const bands: TimeBand[] = [];

  const studyMorningFreeLater =
    /\b(estudio|clases|class(?:es)?).*(?:pero|but|y\s+)?(?:libre|disponible|free|despu[eé]s|after|tarde|later)\b/i.test(
      t
    ) || /\b(?:libre|disponible|free)\s+(?:despu[eé]s|after|m[aá]s\s+tarde|later)\b/i.test(t);

  if (studyMorningFreeLater) {
    bands.push(TIME_BANDS.afternoon, TIME_BANDS.evening);
    return dedupeBands(bands);
  }

  if (/\b(?:despu[eé]s\s+de\s+clases?|after\s+classes?|tras\s+clases?|cuando\s+termino\s+clases?)\b/i.test(t)) {
    bands.push(TIME_BANDS.afterClasses);
  }

  if (/\b(?:mornings?|ma[nñ]anas?|por\s+la\s+ma[nñ]ana|en\s+la\s+ma[nñ]ana)\b/i.test(t) && !studyMorningFreeLater) {
    bands.push(TIME_BANDS.morning);
  }

  if (/\b(?:afternoons?|tardes?|por\s+la\s+tarde|en\s+la\s+tarde)\b/i.test(t)) {
    bands.push(TIME_BANDS.afternoon);
  }

  if (/\b(?:evenings?|nights?|noches?|por\s+la\s+noche|en\s+la\s+noche|at\s+night)\b/i.test(t)) {
    bands.push(TIME_BANDS.night);
  }

  if (/\b(?:casi\s+siempre|mostly|generalmente|usually|a\s+menudo)\s+(?:disponible|free|libre)\b/i.test(t)) {
    bands.push(TIME_BANDS.flexibleDay);
  }

  if (/\b(?:media\s+jornada|part[-\s]?time|medio\s+tiempo)\b/i.test(t)) {
    bands.push(TIME_BANDS.afternoon);
  }

  if (/\b(?:ma[nñ]anas?\s+muy\s+tempranas?|very\s+early\s+mornings?)\b/i.test(t)) {
    bands.push({ start: '06:00', end: '10:00' });
  }

  if (/\b(?:remoto|remote|flexible|horarios?\s+flexibles?)\b/i.test(t)) {
    bands.push(TIME_BANDS.flexibleDay);
  }

  return dedupeBands(bands);
}

function dedupeBands(bands: TimeBand[]): TimeBand[] {
  const seen = new Set<string>();
  return bands.filter((b) => {
    const key = `${b.start}-${b.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveDaysForSegment(segment: string, detected: Weekday[]): Weekday[] {
  if (detected.length > 0) return detected;

  const t = segment.toLowerCase();
  if (
    /\b(?:media\s+jornada|part[-\s]?time|diarias?|habitualmente|entre\s+semana|despu[eé]s\s+de\s+clases?|after\s+classes?|tras\s+clases?|cuando\s+termino\s+clases?)\b/i.test(t)
  ) {
    return [...WEEKDAYS_WORK];
  }

  return detected;
}

function parseExplicitSegment(segment: string): { days: Weekday[]; slots: TimeSlotInput[] } | null {
  const twelveHourMatch = TWELVE_HOUR_RANGE.exec(segment);
  if (twelveHourMatch) {
    const days = resolveDaysForSegment(segment, detectDays(segment));
    if (days.length === 0) return null;

    const start = to24Hour(twelveHourMatch[1], twelveHourMatch[2], twelveHourMatch[3]);
    const end = to24Hour(twelveHourMatch[4], twelveHourMatch[5], twelveHourMatch[6]);
    if (!start || !end || start >= end) return null;

    return { days, slots: [{ start, end }] };
  }

  const match = EXPLICIT_RANGE.exec(segment);
  if (!match) return null;

  // Evita confundir "4 a 5 horas diarias" con un rango horario.
  const durationMatch = /\b(\d{1,2})\s*a\s*(\d{1,2})\s*horas\b/i.exec(segment);
  if (
    durationMatch &&
    match.index !== undefined &&
    match.index >= durationMatch.index &&
    match.index < durationMatch.index + durationMatch[0].length
  ) {
    return null;
  }

  const days = resolveDaysForSegment(segment, detectDays(segment));
  if (days.length === 0) return null;

  const slot = {
    start: normalizeTime(match[1], match[2]),
    end: normalizeTime(match[3], match[4]),
  };

  if (slot.start >= slot.end) return null;

  return { days, slots: [slot] };
}

/**
 * Interpreta disponibilidad en lenguaje natural (español/inglés) sin exigir formato rígido.
 */
export function parseAvailabilityHeuristic(text: string): AvailabilityDayInput[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const byDay = new Map<Weekday, TimeSlotInput[]>();
  const segments = splitAvailabilitySegments(trimmed);

  for (const segment of segments) {
    const explicit = parseExplicitSegment(segment);
    if (explicit) {
      for (const day of explicit.days) {
        mergeSlots(byDay, day, explicit.slots);
      }
      continue;
    }

    const days = resolveDaysForSegment(segment, detectDays(segment));
    if (days.length === 0) continue;

    const bands = detectTimeBands(segment);
    if (bands.length === 0) continue;

    for (const day of days) {
      mergeSlots(byDay, day, bands);
    }
  }

  return WEEKDAYS.filter((day) => byDay.has(day)).map((day) => ({
    day,
    timeSlots: byDay.get(day) ?? [],
  }));
}
