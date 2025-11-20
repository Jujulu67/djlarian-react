'use client';

import * as React from 'react';
import { format, parse, isValid } from 'date-fns'; // Moins de dépendances directes à setHours/setMinutes ici
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateTimePickerProps {
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  className?: string;
}

export function DateTimePicker({ value, onChange, className }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value instanceof Date && isValid(value) ? value : undefined
  );
  const [hours, setHoursState] = React.useState<string>( // Renommer pour éviter conflit avec la fonction date-fns
    value instanceof Date && isValid(value) ? format(value, 'HH') : '00'
  );
  const [minutes, setMinutesState] = React.useState<string>( // Renommer pour éviter conflit avec la fonction date-fns
    value instanceof Date && isValid(value) ? format(value, 'mm') : '00'
  );

  // Synchronize internal state if the external value changes
  React.useEffect(() => {
    if (value instanceof Date && isValid(value)) {
      setSelectedDate(value);
      setHoursState(format(value, 'HH'));
      setMinutesState(format(value, 'mm'));
    } else {
      setSelectedDate(undefined);
      setHoursState('00');
      setMinutesState('00');
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      // Ne pas appeler onChange ici si aucune date n'est sélectionnée
      // On pourrait appeler onChange(null) si on veut effacer via le calendrier
      return;
    }
    // Conserver l'heure/minute actuelle des états locaux
    const currentHours = parseInt(hours, 10) || 0;
    const currentMinutes = parseInt(minutes, 10) || 0;

    // Reconstruire la date avec l'heure/minute actuelles
    const newDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      currentHours,
      currentMinutes
    );

    if (isValid(newDate)) {
      setSelectedDate(newDate); // Mettre à jour l'état interne
      onChange(newDate); // Appeler onChange avec la nouvelle date complète
    }
  };

  const handleTimeChange = (type: 'hours' | 'minutes', val: string) => {
    let numericValue = parseInt(val, 10);
    let currentHours = parseInt(hours, 10);
    let currentMinutes = parseInt(minutes, 10);

    if (isNaN(numericValue)) {
      numericValue = 0;
    }

    // Mettre à jour l'état hours/minutes (string)
    if (type === 'hours') {
      if (numericValue < 0 || numericValue > 23) return;
      setHoursState(val.padStart(2, '0'));
      currentHours = numericValue;
    } else {
      // minutes
      if (numericValue < 0 || numericValue > 59) return;
      setMinutesState(val.padStart(2, '0'));
      currentMinutes = numericValue;
    }

    // Reconstruire la date si une date de base existe
    if (selectedDate instanceof Date && isValid(selectedDate)) {
      const newDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        currentHours,
        currentMinutes
      );
      if (isValid(newDate)) {
        // Ne pas appeler setSelectedDate ici pour éviter boucle potentielle
        onChange(newDate); // Appeler directement onChange
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal',
            !selectedDate && 'text-muted-foreground',
            'bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 text-white',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, 'PPP HH:mm', { locale: fr })
          ) : (
            <span>Choisir une date et heure</span>
          )}
        </Button>
      </PopoverTrigger>
      {/* Ajout des props de positionnement */}
      <PopoverContent
        side="bottom" // Essayer en dessous par défaut
        align="start"
        sideOffset={5}
        className="w-auto p-0 bg-gray-900 border border-gray-700 text-white"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
          locale={fr}
          className="rounded-md border-none p-2 m-0 bg-transparent text-white"
          classNames={{
            day_selected: 'bg-purple-600 text-white hover:bg-purple-700 focus:bg-purple-700',
            day_today: 'bg-gray-700 rounded-md text-white',
            day_outside: 'text-gray-500 opacity-50',
            head_cell: 'text-gray-400',
            nav_button: 'hover:bg-gray-700 rounded-md',
            caption_label: 'text-white font-medium',
          }}
        />
        <div className="p-2 border-t border-gray-700 flex items-center justify-center space-x-2">
          <input
            type="number"
            min="0"
            max="23"
            value={hours}
            onChange={(e) => handleTimeChange('hours', e.target.value)}
            className="w-14 p-1 rounded bg-gray-800 border border-gray-600 text-center text-white focus:outline-none focus:border-purple-500"
            aria-label="Heures"
          />
          <span className="text-lg font-medium">:</span>
          <input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => handleTimeChange('minutes', e.target.value)}
            className="w-14 p-1 rounded bg-gray-800 border border-gray-600 text-center text-white focus:outline-none focus:border-purple-500"
            aria-label="Minutes"
          />
        </div>
        <div className="p-2 border-t border-gray-700 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Effacer en interne et appeler onChange
              setSelectedDate(undefined);
              setHoursState('00');
              setMinutesState('00');
              onChange(null);
            }}
            className="text-red-400 hover:text-red-300 hover:bg-gray-800"
          >
            Effacer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
