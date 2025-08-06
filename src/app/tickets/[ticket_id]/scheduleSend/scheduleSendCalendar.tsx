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
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';
import { MouseEventHandler, Dispatch, SetStateAction } from 'react';

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
//These types were taken fron the react-calendar official documentation:https://www.npmjs.com/package/react-calendar

function TimePickingDropdown({ setTime }: { setTime: Dispatch<SetStateAction<string>> }) {
  const options: Array<string> = ['12:00 AM', '12:30 AM'];
  let hour: number = 1;
  let amPm: string = 'AM';
  for (let i = 0; i < 23; i++) {
    if (hour === 12) {
      amPm = 'PM';
    }
    options.push(`${hour}:00 ${amPm}`);
    options.push(`${hour}:30 ${amPm}`);
    hour = hour === 12 ? (hour = 1) : (hour += 1);
  }
  return (
    <div className="mt-5">
      <h3 className="mb-1">Time Selected:</h3>
      <select 
        className="border-1 p-1 w-9/10 h-8 border-b-2 border-stone-400 rounded-sm"
        onChange={(e) => setTime(e.target.value)}
        defaultValue=""
      >
        <option value="" disabled>Select time</option>
        {options.map(time => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
    </div>
  );
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

  if (!date) {
    setDate(minDate);
  }
  return (
    <>
      {popCalendar && (
        <div className="backdrop-blur-sm bg-black/30 h-screen w-screen absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-[#ffff] border-t-black rounded-2xl w-3/10 h-1/2 flex flex-row justify-center items-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-md">
            <div className="flex flex-col w-9/10 h-8/10 mx-aut font-sans">
              <h2 className="text-lg mb-5 font-semibold">Select Custom Day and time</h2>
              <div className="flex flex-row justify-around">
                <Calendar minDate={minDate} maxDate={maxDate} onChange={setDate} value={date} />
                <div className="flex flex-col justify-between h-10/10 w-lg ml-5 font-light">
                  <div>
                    <label className="mb-1">Date selected:</label>
                    <h3 className="border-1 w-9/10 h-8 border-b-2 border-stone-400 rounded-sm p-1">
                      {`${(date as Date).getMonth() + 1}/${(date as Date).getDate()}/${(date as Date).getFullYear()}`}
                    </h3>
                    <TimePickingDropdown setTime={setTime} />
                  </div>
                  <div className="ml-5 flex flex-row justify-between w-4/5">
                    <Button
                      className="text-black bg-blue-50 border-black border-1"
                      onClick={() => {
                        setPopCalendar(false);
                        setSendNow(true);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSendReply}>Send</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
