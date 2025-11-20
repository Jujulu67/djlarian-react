import * as RadixPopover from '@radix-ui/react-popover';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, CheckCircle, Clock, PauseCircle } from 'lucide-react';
import React from 'react';

import { DateTimeField } from '@/components/ui/DateTimeField';

interface PublicationStatusSelectorProps {
  isPublished: boolean | undefined;
  publishAt: string | null | undefined;
  onChange: (status: 'published' | 'draft' | 'scheduled', date?: string) => void;
}

export const PublicationStatusSelector: React.FC<PublicationStatusSelectorProps> = ({
  isPublished,
  publishAt,
  onChange,
}) => {
  const [open, setOpen] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<string>(() => {
    if (publishAt && isValid(parseISO(publishAt))) {
      try {
        return format(parseISO(publishAt), "yyyy-MM-dd'T'HH:mm");
      } catch (e) {
        return '';
      }
    }
    return '';
  });

  React.useEffect(() => {
    if (publishAt && isValid(parseISO(publishAt))) {
      try {
        setTempDate(format(parseISO(publishAt), "yyyy-MM-dd'T'HH:mm"));
      } catch (e) {
        setTempDate('');
      }
    } else {
      setTempDate('');
    }
  }, [publishAt]);

  let statusLabel = 'Brouillon';
  let statusColor = 'text-yellow-400';
  let statusIcon = <PauseCircle className="w-5 h-5 inline-block mr-1" />;
  if (isPublished) {
    statusLabel = 'Publié';
    statusColor = 'text-green-400';
    statusIcon = <CheckCircle className="w-5 h-5 inline-block mr-1" />;
  } else if (publishAt && isValid(parseISO(publishAt))) {
    statusLabel = `Planifié: ${format(parseISO(publishAt), 'dd MMM yyyy HH:mm', { locale: fr })}`;
    statusColor = 'text-blue-400';
    statusIcon = <Clock className="w-5 h-5 inline-block mr-1" />;
  }

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Trigger asChild>
        <button
          type="button"
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-600 bg-gray-800/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 ${statusColor}`}
          aria-label="Changer le statut de publication"
          tabIndex={0}
        >
          <span className="flex items-center font-semibold">
            {statusIcon}
            {statusLabel}
          </span>
          <CalendarIcon className="w-5 h-5 ml-2 opacity-70" />
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Content
        className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-72 mt-2 z-50"
        side="right"
        align="start"
        sideOffset={5}
      >
        <div className="space-y-2">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800 focus:bg-gray-800 focus:outline-none"
            onClick={() => {
              onChange('published');
              setOpen(false);
            }}
            aria-label="Passer en publié"
          >
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-300 font-medium">Publié</span>
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800 focus:bg-gray-800 focus:outline-none"
            onClick={() => {
              onChange('draft');
              setOpen(false);
            }}
            aria-label="Passer en brouillon"
          >
            <PauseCircle className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-300 font-medium">Brouillon</span>
          </button>
          <div className="pt-2 border-t border-gray-700 mt-2">
            <label className="block text-gray-300 text-sm mb-1 font-medium">
              Planifier la publication
            </label>
            <DateTimeField
              value={tempDate}
              onChange={(e) => setTempDate(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            />
            <button
              type="button"
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!tempDate || !isValid(new Date(tempDate))}
              onClick={() => {
                if (tempDate && isValid(new Date(tempDate))) {
                  onChange('scheduled', new Date(tempDate).toISOString());
                  setOpen(false);
                }
              }}
              aria-label="Planifier la publication"
            >
              <Clock className="w-4 h-5 inline-block mr-1" /> Planifier pour cette date
            </button>
          </div>
        </div>
      </RadixPopover.Content>
    </RadixPopover.Root>
  );
};
