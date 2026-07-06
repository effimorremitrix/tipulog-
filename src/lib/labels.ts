export const APPOINTMENT_TYPES = {
  intake: "פגישת אינטייק",
  session: "פגישה טיפולית",
  group: "פגישה קבוצתית",
  followup: "שיחת מעקב",
  other: "אחר",
} as const;

export const APPOINTMENT_STATUSES = {
  scheduled: "מתוכננת",
  completed: "התקיימה",
  cancelled: "בוטלה",
  noshow: "לא הגיע/ה",
} as const;

export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-sky-100 text-sky-800 border-sky-300",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  cancelled: "bg-gray-100 text-gray-500 border-gray-300",
  noshow: "bg-amber-100 text-amber-800 border-amber-300",
};

export const PAYMENT_METHODS = {
  cash: "מזומן",
  transfer: "העברה בנקאית",
  check: "צ'ק",
  card: "כרטיס אשראי",
} as const;

export const PATIENT_STATUSES = {
  active: "פעיל",
  inactive: "לא פעיל",
} as const;

export function label<T extends Record<string, string>>(
  map: T,
  key: string | null | undefined
): string {
  if (!key) return "";
  return map[key as keyof T] ?? key;
}
