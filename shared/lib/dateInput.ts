export function validCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1];
}

export function validDateInput(value: string, type: string, min = "", max = ""): boolean {
  if (!value) return true;
  const valid = type === "date" ? validCalendarDate(value) : (() => {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/.exec(value);
    return Boolean(match && validCalendarDate(match[1]) && Number(match[2]) < 24 && Number(match[3]) < 60 && (!match[4] || Number(match[4]) < 60));
  })();
  return valid && (!min || value >= min) && (!max || value <= max);
}
