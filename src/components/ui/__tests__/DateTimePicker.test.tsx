import { render, screen, fireEvent } from '@testing-library/react';
import { DateTimePicker } from '../DateTimePicker';

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => date.toISOString().slice(0, 16)),
  parse: jest.fn(),
  isValid: jest.fn((date) => date instanceof Date && !isNaN(date.getTime())),
  startOfMonth: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), 1)),
  endOfMonth: jest.fn((date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  startOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())),
  endOfDay: jest.fn(
    (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
  ),
  startOfWeek: jest.fn((date) => date),
  endOfWeek: jest.fn((date) => date),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  subDays: jest.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
  addMonths: jest.fn((date, months) => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
  }),
  subMonths: jest.fn((date, months) => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() - months);
    return newDate;
  }),
  isSameDay: jest.fn((date1, date2) => date1.toDateString() === date2.toDateString()),
  isToday: jest.fn((date) => date.toDateString() === new Date().toDateString()),
  isSameMonth: jest.fn(
    (date1, date2) =>
      date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear()
  ),
  setHours: jest.fn((date, hours) => {
    const newDate = new Date(date);
    newDate.setHours(hours);
    return newDate;
  }),
  setMinutes: jest.fn((date, minutes) => {
    const newDate = new Date(date);
    newDate.setMinutes(minutes);
    return newDate;
  }),
  differenceInCalendarMonths: jest.fn((date1, date2) => {
    const yearDiff = date1.getFullYear() - date2.getFullYear();
    const monthDiff = date1.getMonth() - date2.getMonth();
    return yearDiff * 12 + monthDiff;
  }),
  differenceInCalendarDays: jest.fn((date1, date2) => {
    const timeDiff = date1.getTime() - date2.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  }),
  isDate: jest.fn((value) => value instanceof Date),
  getWeek: jest.fn((date) => {
    // Simple week calculation for testing
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }),
}));

jest.mock('date-fns/locale', () => ({
  fr: {},
}));

describe('DateTimePicker', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render date time picker', () => {
    render(<DateTimePicker value={null} onChange={mockOnChange} />);

    expect(screen.getByText(/Choisir une date et heure/i)).toBeInTheDocument();
  });

  it('should display selected date', () => {
    const date = new Date('2024-01-01T12:00:00');
    render(<DateTimePicker value={date} onChange={mockOnChange} />);

    // The button should show the formatted date
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<DateTimePicker value={null} onChange={mockOnChange} className="custom-class" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should handle null value', () => {
    render(<DateTimePicker value={null} onChange={mockOnChange} />);

    expect(screen.getByText(/Choisir une date et heure/i)).toBeInTheDocument();
  });

  it('should handle undefined value', () => {
    render(<DateTimePicker value={undefined} onChange={mockOnChange} />);

    expect(screen.getByText(/Choisir une date et heure/i)).toBeInTheDocument();
  });
});
