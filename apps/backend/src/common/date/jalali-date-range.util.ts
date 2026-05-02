import { BadRequestException } from '@nestjs/common';

export const ADMIN_REPORT_TIMEZONE = 'Asia/Tehran';
export const JALALI_PERIODS = ['today', 'week', 'month', 'year', 'custom'] as const;

export type JalaliPeriod = (typeof JALALI_PERIODS)[number];

type JalaliDateRangeInput = {
  period?: JalaliPeriod;
  fromDate?: string;
  toDate?: string;
};

type GregorianDateParts = {
  gy: number;
  gm: number;
  gd: number;
};

type JalaliDateParts = {
  jy: number;
  jm: number;
  jd: number;
};

export type ResolvedJalaliDateRange = {
  period: JalaliPeriod;
  from: Date;
  to: Date;
  fromDateJalali: string;
  toDateJalali: string;
  timezone: typeof ADMIN_REPORT_TIMEZONE;
};

const JALALI_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function resolveJalaliDateRange(input: JalaliDateRangeInput): ResolvedJalaliDateRange {
  const period = input.period ?? 'month';
  const today = gregorianToJalaliObject(new Date());

  if (period !== 'custom' && (input.fromDate || input.toDate)) {
    throw new BadRequestException('fromDate و toDate فقط برای بازه custom مجاز هستند');
  }

  if (period === 'custom') {
    if (!input.fromDate || !input.toDate) {
      throw new BadRequestException('برای بازه custom، هر دو فیلد fromDate و toDate اجباری هستند');
    }

    const from = parseJalaliDate(input.fromDate);
    const to = parseJalaliDate(input.toDate);

    if (compareJalaliDates(from, to) > 0) {
      throw new BadRequestException('fromDate نمی‌تواند بعد از toDate باشد');
    }

    return {
      period,
      from: buildUtcDateFromJalaliStart(from),
      to: buildUtcDateFromJalaliEnd(to),
      fromDateJalali: formatJalaliDate(from),
      toDateJalali: formatJalaliDate(to),
      timezone: ADMIN_REPORT_TIMEZONE,
    };
  }

  const from = resolvePresetStart(period, today);
  const to = today;

  return {
    period,
    from: buildUtcDateFromJalaliStart(from),
    to: buildUtcDateFromJalaliEnd(to),
    fromDateJalali: formatJalaliDate(from),
    toDateJalali: formatJalaliDate(to),
    timezone: ADMIN_REPORT_TIMEZONE,
  };
}

export function assertValidJalaliDate(dateString: string) {
  parseJalaliDate(dateString);
}

function resolvePresetStart(period: Exclude<JalaliPeriod, 'custom'>, today: JalaliDateParts): JalaliDateParts {
  if (period === 'today') {
    return today;
  }

  if (period === 'week') {
    const weekdayIndex = getJalaliWeekdayIndex(today);
    return addDaysToJalaliDate(today, -weekdayIndex);
  }

  if (period === 'month') {
    return { jy: today.jy, jm: today.jm, jd: 1 };
  }

  return { jy: today.jy, jm: 1, jd: 1 };
}

function getJalaliWeekdayIndex(date: JalaliDateParts) {
  const gregorian = jalaliToGregorianObject(date);
  const jsDay = new Date(Date.UTC(gregorian.gy, gregorian.gm - 1, gregorian.gd)).getUTCDay();
  return (jsDay + 1) % 7;
}

function addDaysToJalaliDate(date: JalaliDateParts, days: number): JalaliDateParts {
  const gregorian = jalaliToGregorianObject(date);
  const shifted = new Date(Date.UTC(gregorian.gy, gregorian.gm - 1, gregorian.gd + days));
  return gregorianToJalaliObject(shifted);
}

function parseJalaliDate(dateString: string): JalaliDateParts {
  if (!JALALI_DATE_REGEX.test(dateString)) {
    throw new BadRequestException('فرمت تاریخ جلالی باید به شکل YYYY-MM-DD باشد');
  }

  const [jy, jm, jd] = dateString.split('-').map(Number);
  const parts = { jy, jm, jd };

  if (!isValidJalaliDate(parts)) {
    throw new BadRequestException('تاریخ جلالی نامعتبر است');
  }

  return parts;
}

function isValidJalaliDate({ jy, jm, jd }: JalaliDateParts) {
  if (jy < 1 || jm < 1 || jm > 12 || jd < 1) {
    return false;
  }

  const monthLength = getJalaliMonthLength(jy, jm);
  return jd <= monthLength;
}

function getJalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) {
    return 31;
  }

  if (jm <= 11) {
    return 30;
  }

  return isJalaliLeapYear(jy) ? 30 : 29;
}

function buildUtcDateFromJalaliStart(date: JalaliDateParts) {
  const { gy, gm, gd } = jalaliToGregorianObject(date);
  return new Date(Date.UTC(gy, gm - 1, gd, 0, 0, 0, 0));
}

function buildUtcDateFromJalaliEnd(date: JalaliDateParts) {
  const { gy, gm, gd } = jalaliToGregorianObject(date);
  return new Date(Date.UTC(gy, gm - 1, gd, 23, 59, 59, 999));
}

function formatJalaliDate({ jy, jm, jd }: JalaliDateParts) {
  return `${jy.toString().padStart(4, '0')}-${jm.toString().padStart(2, '0')}-${jd
    .toString()
    .padStart(2, '0')}`;
}

function compareJalaliDates(left: JalaliDateParts, right: JalaliDateParts) {
  if (left.jy !== right.jy) {
    return left.jy - right.jy;
  }

  if (left.jm !== right.jm) {
    return left.jm - right.jm;
  }

  return left.jd - right.jd;
}

function gregorianToJalaliObject(date: Date): JalaliDateParts {
  const gy = date.getUTCFullYear();
  const gm = date.getUTCMonth() + 1;
  const gd = date.getUTCDate();

  return gregorianToJalali(gy, gm, gd);
}

function jalaliToGregorianObject(date: JalaliDateParts): GregorianDateParts {
  return jalaliToGregorian(date.jy, date.jm, date.jd);
}

function div(a: number, b: number) {
  return Math.floor(a / b);
}

function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDateParts {
  const gdm = [0, 31, isGregorianLeap(gy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) -
    80 +
    gd;

  for (let month = 1; month < gm; month += 1) {
    days += gdm[month];
  }

  jy += 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;

  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }

  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? (days % 31) : ((days - 186) % 30));

  return { jy, jm, jd };
}

function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDateParts {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;

  let days =
    365 * jy +
    div(jy, 33) * 8 +
    div((jy % 33) + 3, 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  gy += 400 * div(days, 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;

    if (days >= 365) {
      days += 1;
    }
  }

  gy += 4 * div(days, 1461);
  days %= 1461;

  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }

  let gd = days + 1;
  const salA = [0, 31, isGregorianLeap(gy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;

  for (gm = 1; gm <= 12 && gd > salA[gm]; gm += 1) {
    gd -= salA[gm];
  }

  return { gy, gm, gd };
}

function isGregorianLeap(gy: number) {
  return (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
}

function isJalaliLeapYear(jy: number) {
  const normalizedYear = jy > 979 ? jy - 979 : jy;
  const remainder = normalizedYear % 33;
  return [1, 5, 9, 13, 17, 22, 26, 30].includes(remainder);
}
