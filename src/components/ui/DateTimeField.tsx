import React from 'react';

interface DateTimeFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: string;
  required?: boolean;
  className?: string;
  error?: boolean;
  type?: 'date' | 'datetime-local';
}

export const DateTimeField: React.FC<DateTimeFieldProps> = ({
  value,
  onChange,
  min,
  required,
  className = '',
  error = false,
  type = 'datetime-local',
}) => {
  return (
    <>
      <style jsx global>{`
        .datetime-field {
          position: relative;
          width: 100%;
        }

        .datetime-field input[type='datetime-local'],
        .datetime-field input[type='date'] {
          position: relative;
          padding-right: 1rem;
          padding-left: 2.5rem;
          cursor: pointer;
          color-scheme: dark;
          min-width: 100%;
          width: 100%;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background-image: none;
        }

        /* Cacher l'icône native */
        .datetime-field input[type='datetime-local']::-webkit-calendar-picker-indicator,
        .datetime-field input[type='date']::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }

        .datetime-field::before {
          content: '';
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.25rem;
          height: 1.25rem;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='16' y1='2' x2='16' y2='6'%3E%3C/line%3E%3Cline x1='8' y1='2' x2='8' y2='6'%3E%3C/line%3E%3Cline x1='3' y1='10' x2='21' y2='10'%3E%3C/line%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
          pointer-events: none;
          z-index: 1;
        }

        /* Styles pour positionner le calendrier au-dessus */
        ::-webkit-datetime-edit-fields-wrapper {
          padding: 0;
        }

        /* Force le calendrier à s'ouvrir au-dessus */
        input[type='datetime-local']::-webkit-calendar-picker,
        input[type='date']::-webkit-calendar-picker {
          margin-top: -100vh;
        }
      `}</style>

      <div className="datetime-field">
        <input
          type={type}
          className={`bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 ${
            error ? 'border-red-500 bg-red-900/10' : ''
          } ${className}`}
          value={value || ''}
          onChange={onChange}
          min={min}
          required={required}
          onClick={(e) => e.currentTarget.showPicker()}
        />
      </div>
    </>
  );
};
