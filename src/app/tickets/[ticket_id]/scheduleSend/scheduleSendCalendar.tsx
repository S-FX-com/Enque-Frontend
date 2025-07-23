import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React from 'react';

interface Props {
  date: Date;
  setDate: React.Dispatch<React.SetStateAction<Date>>;
  popCalendar: boolean;
  setPopCalendar: React.Dispatch<React.SetStateAction<boolean>>;
  setSendNow: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ScheduleSendCalendar({
  date,
  setDate,
  popCalendar,
  setPopCalendar,
  setSendNow,
}: Props) {
  return (
    <>
      {popCalendar && (
        <div className="absolute top-140 left-190">
          <Calendar onChange={() => setDate} value={date} />
          <h3>Date selected: {date as unknown as string}</h3>
        </div>
      )}
      <div className="border-r rounded-r">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>
              <ChevronDown color="#ffffff" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <div className="w-full bg-background border-stone-950">
              <DropdownMenuItem
                onSelect={() => {
                  setPopCalendar(false);
                  setSendNow(true);
                }}
              >
                Send now
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setPopCalendar(true);
                  setSendNow(false);
                }}
              >
                Schedule send
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
