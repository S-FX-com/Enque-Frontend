'use client';

import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TimePickingSelectProps {
  setTime: Dispatch<SetStateAction<string>>;
}

export function TimePickingSelect({ setTime }: TimePickingSelectProps) {
  const options: Array<string> = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const amPm = h < 12 ? 'AM' : 'PM';
      const minute = m === 0 ? '00' : '30';
      options.push(`${hour}:${minute} ${amPm}`);
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="time-select">Time Selected:</Label>
      <Select onValueChange={setTime} defaultValue="">
        <SelectTrigger id="time-select" className="w-full">
          <SelectValue placeholder="Select time" />
        </SelectTrigger>
        <SelectContent>
          {options.map(time => (
            <SelectItem key={time} value={time}>
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
