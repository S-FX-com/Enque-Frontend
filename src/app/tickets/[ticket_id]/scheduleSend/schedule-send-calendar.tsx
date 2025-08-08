'use client';

import React, { MouseEventHandler, Dispatch, SetStateAction } from 'react';
import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TimePickingSelect } from './time-picking-select';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface Props {
  day: number;
  month: number;
  year: number;
  popCalendar: boolean;
  setPopCalendar: React.Dispatch<React.SetStateAction<boolean>>;
  setSendNow: React.Dispatch<React.SetStateAction<boolean>>;
  handleSendReply: MouseEventHandler<HTMLButtonElement>;
  date: Value;
  setDate: Dispatch<SetStateAction<Value>>;
  setTime: Dispatch<SetStateAction<string>>;
}

export function ScheduleSendCalendar({
  day,
  month,
  year,
  popCalendar,
  setPopCalendar,
  setSendNow,
  handleSendReply,
  date,
  setDate,
  setTime,
}: Props) {
  const maxDate: Date = new Date(year, month, day + 30);
  const minDate: Date = new Date(year, month, day);

  // Ensure date is initialized if null
  React.useEffect(() => {
    if (!date) {
      setDate(minDate);
    }
  }, [date, minDate, setDate]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate || null);
  };

  return (
    <>
      <Dialog open={popCalendar} onOpenChange={setPopCalendar}>
        <DialogContent className="sm:max-w-[600px] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Select Custom Day and Time</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col md:flex-row justify-center items-center md:items-start p-6 pt-0 gap-6">
            <Calendar
              mode="single"
              selected={date instanceof Date ? date : undefined}
              onSelect={handleDateSelect}
              fromDate={minDate}
              toDate={maxDate}
              className="rounded-md border"
            />
            <div className="flex flex-col justify-between h-full w-full max-w-xs gap-4">
              <div className="grid gap-2">
                <p className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Date selected:
                </p>
                <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  {date instanceof Date ? format(date, 'MM/dd/yyyy') : 'No date selected'}
                </div>
              </div>
              <TimePickingSelect setTime={setTime} />
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPopCalendar(false);
                setSendNow(true);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSendReply}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-r-md border-r border-y border-l-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-l-none h-10 px-3">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onSelect={() => {
                setPopCalendar(true);
                setSendNow(false);
              }}
            >
              Schedule send
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
