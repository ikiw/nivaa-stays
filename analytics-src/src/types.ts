// Shape of the Bookings Apps Script ?analytics=1 response.

export interface MonthRec {
  month: string;        // 'YYYY-MM'
  bookings: number;
  nights: number;
  revenue: number;
  availNights: number;
  occupancy: number;    // %
  adr: number;
  revpar: number;
}

export interface DayCell {
  date: string;         // 'YYYY-MM-DD'
  day: number;
  dow: number;          // 0 Sun .. 6 Sat
  booked: number;
  free: number;
}

export interface WeekRec {
  from: number;
  to: number;
  nights: number;
  revenue: number;
  bookings: number;
  availNights: number;
}

export interface CurrentMonthRec {
  month: string;
  today: string;
  dayOfMonth: number;
  daysInMonth: number;
  daysRemaining: number;
  bookings: number;
  nights: number;
  revenue: number;
  availNights: number;
  days: DayCell[];
  weeks: WeekRec[];
}

export interface Channel {
  name: string;
  bookings: number;
  revenue: number;
  nights: number;
}

export interface AnalyticsData {
  generated: string;
  rooms: number;
  revenueTarget: number;
  current: CurrentMonthRec;
  months: MonthRec[];
  channels: Channel[];
  roomSplit: Record<string, number>;
  weekday: { weekday: number; weekend: number };
  payments: { revenue: number; collected: number; pending: number };
  repeat: { guests: number; returning: number; rate: number };
  totals: { bookings: number; nights: number; revenue: number; alos: number; avgGuests: number };
}
