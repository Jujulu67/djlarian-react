import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type ChangeEvent } from 'react';

import { DateTimeField } from '../DateTimeField';

/** Comme le formulaire d'événement : l'état est rangé sous `e.target.name`. */
function Form() {
  const [data, setData] = useState<Record<string, string>>({ date: '' });
  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setData({ ...data, [e.target.name]: e.target.value });
  return (
    <div data-testid="field">
      <DateTimeField name="date" value={data.date} onChange={handleChange} />
    </div>
  );
}

describe('DateTimeField', () => {
  it('garde la date saisie dans un formulaire qui se base sur le nom du champ', () => {
    render(<Form />);
    const input = screen.getByTestId('field').querySelector('input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '2030-01-15T20:00' } });

    expect(input.value).toBe('2030-01-15T20:00');
  });
});
