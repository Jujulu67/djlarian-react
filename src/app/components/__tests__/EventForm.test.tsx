/**
 * Tests for EventForm Component
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventForm, { EventFormData } from '../EventForm';
import { RecurrenceConfig } from '../EventForm/types';

// Mock dependencies
jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/utils/findOriginalImageUrl', () => ({
  findOriginalImageUrl: jest.fn().mockResolvedValue('http://example.com/original.jpg'),
}));

// Mock UI components
jest.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled, type, className }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} className={className}>
      {children}
    </button>
  ),
  Input: (props: any) => <input {...props} />,
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
  Switch: ({ checked, onCheckedChange, id }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid="switch"
    />
  ),
  Textarea: (props: any) => <textarea {...props} />,
}));

jest.mock('@/components/ui/DateTimeField', () => ({
  DateTimeField: ({ value, onChange, error }: any) => (
    <input
      data-testid="date-field"
      value={value || ''}
      onChange={onChange}
      className={error ? 'error' : ''}
    />
  ),
}));

jest.mock('@/components/ui/ImageCropModal', () => () => <div>ImageCropModal</div>);
jest.mock(
  '@/components/ui/ImageDropzone',
  () =>
    ({ onDrop, onRecrop, onRemove, canRecrop }: any) => (
      <div>
        ImageDropzone
        <button
          onClick={() =>
            onDrop({ target: { files: [new File([''], 'test.png', { type: 'image/png' })] } })
          }
        >
          Drop Image
        </button>
        {canRecrop && <button onClick={onRecrop}>Recrop</button>}
        <button onClick={onRemove}>Remove Image</button>
      </div>
    )
);

jest.mock('@/components/admin/PublicationStatusSelector', () => ({
  PublicationStatusSelector: () => <div>PublicationStatusSelector</div>,
}));

jest.mock('../EventForm/components/EventFormTickets', () => ({
  EventFormTickets: () => <div>EventFormTickets</div>,
}));

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: jest.fn(),
    getInputProps: jest.fn(),
  }),
}));

const mockFormData: EventFormData = {
  title: '',
  date: '',
  location: '',
  description: '',
  isPublished: false,
  recurrence: {
    isRecurring: false,
    frequency: 'weekly',
    day: 1,
    excludedDates: [],
  },
  tickets: {
    type: 'free',
  },
};

const defaultProps = {
  formData: mockFormData,
  errors: {},
  handleSubmit: jest.fn((e) => e.preventDefault()),
  handleChange: jest.fn(),
  handleCheckboxChange: jest.fn(),
  handleRemoveImage: jest.fn(),
  onImageSelected: jest.fn(),
  setFormData: jest.fn(),
  isEditMode: false,
};

describe('EventForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form fields correctly', () => {
    render(<EventForm {...defaultProps} />);

    expect(screen.getByLabelText(/Titre de l'événement/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lieu/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByText(/Image de l'événement/i)).toBeInTheDocument();
    expect(screen.getByText('EventFormTickets')).toBeInTheDocument();
  });

  it('should handle input changes', async () => {
    const user = userEvent.setup();
    render(<EventForm {...defaultProps} />);

    const titleInput = screen.getByLabelText(/Titre de l'événement/i);
    await user.type(titleInput, 'New Event');

    expect(defaultProps.handleChange).toHaveBeenCalled();
  });

  it('should toggle recurrence options', async () => {
    const user = userEvent.setup();
    const setFormData = jest.fn();
    render(<EventForm {...defaultProps} setFormData={setFormData} />);

    const recurrenceSwitch = screen.getByTestId('switch');
    await user.click(recurrenceSwitch);

    expect(setFormData).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrence: expect.objectContaining({
          isRecurring: true,
        }),
      })
    );
  });

  it('should show recurrence fields when enabled', () => {
    const recurringFormData = {
      ...mockFormData,
      recurrence: {
        ...mockFormData.recurrence!,
        isRecurring: true,
      },
    };

    render(<EventForm {...defaultProps} formData={recurringFormData} />);

    expect(screen.getByLabelText(/Fréquence de répétition/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Jour de la semaine/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date de fin de récurrence/i)).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const user = userEvent.setup();

    const Wrapper = () => {
      const [formData, setFormData] = React.useState(mockFormData);
      const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
      };
      // Mock DateTimeField change
      const handleDateChange = (e: any) => {
        setFormData((prev) => ({ ...prev, date: e.target.value }));
      };

      return (
        <EventForm
          {...defaultProps}
          formData={formData}
          setFormData={setFormData}
          handleChange={handleChange}
        />
      );
    };

    render(<Wrapper />);

    const titleInput = screen.getByLabelText(/Titre de l'événement/i);
    await user.type(titleInput, 'My Event');

    const locationInput = screen.getByLabelText(/Lieu/i);
    await user.type(locationInput, 'Paris');

    const descInput = screen.getByLabelText(/Description/i);
    await user.type(descInput, 'A great event');

    const dateInputs = screen.getAllByTestId('date-field');
    // Simulate date change manually since our mock DateTimeField uses onChange directly
    fireEvent.change(dateInputs[0], { target: { value: '2023-01-01T12:00' } });

    const submitButton = screen.getByText("Créer l'événement");
    await user.click(submitButton);

    expect(defaultProps.handleSubmit).toHaveBeenCalled();
  });

  it('should display validation errors', () => {
    const errors = {
      title: 'Title is required',
      location: 'Location is required',
    };

    render(<EventForm {...defaultProps} errors={errors} />);

    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Location is required')).toBeInTheDocument();
  });

  it('should handle image removal', async () => {
    const user = userEvent.setup();
    render(<EventForm {...defaultProps} />);

    const removeButton = screen.getByText('Remove Image');
    await user.click(removeButton);

    expect(defaultProps.handleRemoveImage).toHaveBeenCalled();
  });
});
