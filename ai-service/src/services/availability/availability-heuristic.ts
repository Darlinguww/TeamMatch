/**
 * Heurística de disponibilidad (mantener alineada con backend/availability-heuristic.ts).
 */

export interface ParsedAvailabilitySlot {
  day: string;
  timeSlots: Array<{ start: string; end: string }>;
}

type TimeBand = { start: string; end: string };

const WEEKDAYS_WORK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const WEEKEND_DAYS = ['saturday', 'sunday'] as const;
const ALL_DAYS = [...WEEKDAYS_WORK, ...WEEKEND_DAYS] as const;

const TIME_BANDS: Record<string, TimeBand> = {
  morning: { start: '08:00', end: '12:00' },
  afternoon: { start: '14:00', end: '18:00' },
  evening: { start: '18:00', end: '22:00' },
  night: { start: '20:00', end: '23:00' },
  afterClasses: { start: '18:00', end: '22:00' },
  flexibleDay: { start: '09:00', end: '18:00' },
};

const DAY_ALIASES: Record<string, (typeof ALL_DAYS)[number]> = {
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

function normalizeTime(hour: string, minute?: string): string {
  const h = Number(hour);
  const m = minute === undefined ? 0 : Number(minute);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function mergeSlots(
  byDay: Map<string, Array<{ start: string; end: string }>>,
  day: string,
  slots: Array<{ start: string; end: string }>
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

function detectDays(text: string): string[] {
  const t = text.toLowerCase();
  const days = new Set<string>();

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

  if (bands.length === 0) {
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

function parseExplicitSegment(segment: string): { days: string[]; slots: TimeBand[] } | null {
  const match = EXPLICIT_RANGE.exec(segment);
  if (!match) return null;

  const days = detectDays(segment);
  if (days.length === 0) return null;

  const slot = {
    start: normalizeTime(match[1], match[2]),
    end: normalizeTime(match[3], match[4]),
  };

  if (slot.start >= slot.end) return null;

  return { days, slots: [slot] };
}

export function parseAvailabilityHeuristic(text: string): ParsedAvailabilitySlot[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const byDay = new Map<string, Array<{ start: string; end: string }>>();
  const segments = trimmed.split(/[.;\n]+/).map((s) => s.trim()).filter(Boolean);

  for (const segment of segments) {
    const explicit = parseExplicitSegment(segment);
    if (explicit) {
      for (const day of explicit.days) {
        mergeSlots(byDay, day, explicit.slots);
      }
      continue;
    }

    const days = detectDays(segment);
    if (days.length === 0) continue;

    const bands = detectTimeBands(segment);
    for (const day of days) {
      mergeSlots(byDay, day, bands);
    }
  }

  if (byDay.size === 0) {
    const days = detectDays(trimmed);
    const bands = detectTimeBands(trimmed);
    for (const day of days.length > 0 ? days : [...WEEKDAYS_WORK]) {
      mergeSlots(byDay, day, bands);
    }
  }

  return ALL_DAYS.filter((day) => byDay.has(day)).map((day) => ({
    day,
    timeSlots: byDay.get(day) ?? [],
  }));
}
