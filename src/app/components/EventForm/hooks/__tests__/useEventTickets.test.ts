import { renderHook, act } from '@testing-library/react';

import { EventFormData } from '../types';
import { useEventTickets } from '../useEventTickets';

const mockFormData: EventFormData = {
  title: 'Test Event',
  description: 'Test Description',
  location: 'Test Location',
  startDate: '2024-01-01',
  hasTickets: false,
  featured: false,
  tickets: {
    price: 0,
    currency: 'EUR',
    buyUrl: '',
    quantity: 0,
  },
} as EventFormData;

describe('useEventTickets', () => {
  const mockHandleChange = jest.fn();
  const mockHandleCheckboxChange = jest.fn();
  const mockSetFormData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with form data values', () => {
    const { result } = renderHook(() =>
      useEventTickets({
        formData: mockFormData,
        setFormData: mockSetFormData,
        handleChange: mockHandleChange,
        handleCheckboxChange: mockHandleCheckboxChange,
      })
    );

    expect(result.current.hasTickets).toBe(false);
    expect(result.current.featured).toBe(false);
    expect(result.current.tickets).toEqual(mockFormData.tickets);
  });

  it('should toggle hasTickets', () => {
    const { result } = renderHook(() =>
      useEventTickets({
        formData: mockFormData,
        setFormData: mockSetFormData,
        handleChange: mockHandleChange,
        handleCheckboxChange: mockHandleCheckboxChange,
      })
    );

    act(() => {
      result.current.toggleHasTickets(true);
    });

    expect(mockHandleCheckboxChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: 'hasTickets',
          checked: true,
        }),
      })
    );
  });

  it('should toggle featured', () => {
    const { result } = renderHook(() =>
      useEventTickets({
        formData: mockFormData,
        setFormData: mockSetFormData,
        handleChange: mockHandleChange,
        handleCheckboxChange: mockHandleCheckboxChange,
      })
    );

    act(() => {
      result.current.toggleFeatured(true);
    });

    expect(mockHandleCheckboxChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: 'featured',
          checked: true,
        }),
      })
    );
  });

  it('should expose handleChange function', () => {
    const { result } = renderHook(() =>
      useEventTickets({
        formData: mockFormData,
        setFormData: mockSetFormData,
        handleChange: mockHandleChange,
        handleCheckboxChange: mockHandleCheckboxChange,
      })
    );

    expect(result.current.handleChange).toBe(mockHandleChange);
  });

  it('should handle tickets from form data', () => {
    const formDataWithTickets: EventFormData = {
      ...mockFormData,
      hasTickets: true,
      tickets: {
        price: 25,
        currency: 'USD',
        buyUrl: 'https://example.com',
        quantity: 100,
      },
    };

    const { result } = renderHook(() =>
      useEventTickets({
        formData: formDataWithTickets,
        setFormData: mockSetFormData,
        handleChange: mockHandleChange,
        handleCheckboxChange: mockHandleCheckboxChange,
      })
    );

    expect(result.current.hasTickets).toBe(true);
    expect(result.current.tickets).toEqual(formDataWithTickets.tickets);
  });
});
