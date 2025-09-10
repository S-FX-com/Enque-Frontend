'use client';

import * as React from 'react';
import { Dispatch, SetStateAction, useEffect } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Value } from './valueType';

interface TimePickingSelectProps {
  nowDate: Value;
  setTime: Dispatch<SetStateAction<string>>;
}

export function TimePickingSelect({ setTime, nowDate }: TimePickingSelectProps) {
  const nowDateAsDate = nowDate as Date;
  const [firstHour, setFirstHour] = React.useState<number>(0);
  const [firstMinute, setFirstMinute] = React.useState<number>(0);
  useEffect(() => {
    const now = new Date();
    if (now.getDate() === nowDateAsDate.getDate()) {
      setFirstHour(now.getHours());
      setFirstMinute(now.getMinutes() < 30 ? 30 : 0);
    }
  }, [nowDateAsDate]);
  // if (now.getDate() === nowDateAsDate.getDate()) {
  //   setFirstHour(now.getHours());
  //   setFirstMinute(now.getMinutes() < 30 ? 30 : 0);
  // }

  const options: Array<string> = [];
  for (let h = firstHour; h < 24; h++) {
    for (let m = firstMinute; m < 60; m += 30) {
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
