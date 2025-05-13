'use client';

import React, { useState } from 'react'; // Add useState
import Link from 'next/link';
import { BellIcon, HelpCircleIcon, LogOutIcon, SearchIcon, PlusCircle } from 'lucide-react'; // Added PlusCircle
import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'; // Keep existing ui imports
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Import Popover separately
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { handleLogout, UserSession } from '@/lib/auth';
import BoringAvatar from 'boring-avatars';
import { ModeToggle } from './mode-toggle';
import { getNotifications } from '@/services/activity';
import { Activity } from '@/typescript/activity';
// import { formatDistanceToNow, parseISO } from 'date-fns'; // Removed unused date-fns imports
import { formatRelativeTime } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Define avatar color palettes (copied from conversation-message-item)
const agentAvatarColors = ['#1D73F4', '#D4E4FA'];
const userAvatarColors = ['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989'];

interface Breadcrumb {
  label: string;
  href: string;
}

interface TopbarProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
  user?: UserSession | null;
  onNewTicketClick?: () => void; // Add optional prop for the button action
}

export function Topbar({
  title = 'Dashboard',
  breadcrumbs = [],
  user,
  onNewTicketClick,
}: TopbarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Fetch notifications when the popover might open or user changes
  const { data: notifications = [], isLoading: isLoadingNotifications } = useQuery<
    Activity[],
    Error
  >({
    queryKey: ['notifications', user?.id], // Depend on user ID
    queryFn: () => getNotifications(15), // Fetch recent 15 notifications
    enabled: !!user?.id, // Only fetch if user is loaded
    staleTime: 1000 * 60, // Refetch after 1 minute if stale
    refetchInterval: 1000 * 60 * 2, // Optional: Refetch every 2 minutes
  });

  // Function to clear cache (in-memory and persisted) and then logout
  const logoutAndClearCache = () => {
    console.log('Clearing React Query cache and persisted storage before logout...');
    queryClient.clear(); // Clear the in-memory cache
    // Attempt to remove the default persisted cache key
    try {
      localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
    } catch (error) {
      console.error('Failed to remove persisted cache from localStorage:', error);
      // Continue logout even if removing item fails
    }
    handleLogout(); // Proceed with original logout logic
  };

  return (
    <div className="flex items-center justify-between w-full py-6">
      {/* Title and Breadcrumbs Section */}
      <div className="flex flex-col gap-1">
        {/* Breadcrumbs */}
        <div className="flex items-center text-sm text-muted-foreground">
          {breadcrumbs.length > 0 ? (
            breadcrumbs.map((item, index) => (
              <React.Fragment key={item.href}>
                {index > 0 && <span className="mx-1">/</span>}
                <Link href={item.href} className="hover:text-primary">
                  {item.label}
                </Link>
              </React.Fragment>
            ))
          ) : (
            // Optional: Placeholder if no breadcrumbs
            <span>&nbsp;</span>
          )}
        </div>
        {/* Title and optional New Ticket Button */}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {/* Conditionally render the button if the handler is provided */}
          {onNewTicketClick && (
            <Button size="sm" variant="default" onClick={onNewTicketClick} className="ml-2">
              <PlusCircle className="mr-2 h-4 w-4" /> New
            </Button>
          )}
        </div>
      </div>

      {/* Right side controls (Search, Icons, User Menu) */}
      <div className="flex items-center gap-0.5 px-1 py-1 bg-white rounded-full border border-slate-100">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search"
            className="w-56 pl-8 h-9 bg-[#F4F7FE] border-0 rounded-full"
          />
        </div>
        {/* Notifications Popover */}
        <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
          <PopoverTrigger asChild>
            {/* TODO: Add indicator for unread notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 dark:text-slate-500 mx-0.5 relative"
            >
              <BellIcon /> {/* Removed explicit size to test base style */}
              {/* Show red dot indicator when there are notifications */}
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-4 font-medium border-b">Notifications</div>
                  <ScrollArea className="h-72">
                    {' '}
                    {/* Fixed height and scroll */}
                    <div className="p-4 space-y-4">
                      {isLoadingNotifications ? (
                        <p className="text-sm text-muted-foreground text-center">Loading...</p>
                      ) : notifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center">
                          No new notifications.
                        </p>
                      ) : (
                        notifications.map(notification => {
                          // Determine avatar details and colors based on source type and creator/agent
                          const isTicketCreation = notification.source_type === 'Ticket';
                          const isUserCreator =
                            isTicketCreation &&
                            (notification.creator_user_id || notification.creator_user_email);

                          const avatarName = isUserCreator
                            ? notification.creator_user_email ||
                              `user-${notification.creator_user_id}` ||
                              'unknown-user'
                            : notification.agent?.email ||
                              notification.agent?.name ||
                              `agent-${notification.agent_id}` ||
                              'system';

                          const displayName = isUserCreator
                            ? notification.creator_user_name || 'User'
                            : notification.agent?.name || 'System';

                          const avatarColors = isUserCreator ? userAvatarColors : agentAvatarColors; // Choose palette

                          const notificationContent = (
                            <div className="flex items-start gap-3">
                              <BoringAvatar
                                size={32}
                                name={avatarName}
                                variant="beam"
                                colors={avatarColors} // Apply correct color palette
                              />
                              <div className="text-sm flex-1">
                                <p>
                                  <span className="font-medium">{displayName}</span>{' '}
                                  {/* Always show "logged a new ticket" for Ticket source type */}
                                  {isTicketCreation ? 'logged a new ticket' : notification.action}
                                  {/* Display ticket ID, but link is outside */}
                                  {isTicketCreation && notification.source_id && (
                                    <span className="text-primary ml-1">
                                      #{notification.source_id}
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatRelativeTime(notification.created_at)}
                                </p>
                              </div>
                              {/* Optional: Add 'mark as read' button */}
                              {/* {!notification.is_read && ( ... mark as read button ... )} */}
                            </div>
                          );

                          // Wrap with Link only if it's a ticket notification with an ID
                          // Use query parameter to signal opening the ticket panel
                          return isTicketCreation && notification.source_id ? (
                            <Link
                              href={`/tickets?openTicket=${notification.source_id}`}
                              key={notification.id}
                              className="block hover:bg-muted/50 rounded-md -m-1 p-1"
                              onClick={() => setIsNotificationsOpen(false)} // Close popover on click
                            >
                              {notificationContent}
                            </Link>
                          ) : (
                            <div key={notification.id}>
                              {' '}
                              {/* Non-clickable div for other notifications */}
                              {notificationContent}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                  {/* Optional Footer */}
                  {/* <div className="p-2 border-t text-center">
                                        <Button variant="link" size="sm">View all</Button>
                                    </div> */}
                </motion.div>
              )}
            </AnimatePresence>
          </PopoverContent>
        </Popover>
        <ModeToggle /> {/* ModeToggle likely controls its own icon size internally */}
        <Button variant="ghost" size="icon" className="text-slate-400 mx-0.5">
          <HelpCircleIcon /> {/* Removed explicit size to test base style */}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* Restore original w-10 h-10 and remove size="icon" */}
            <Button variant="ghost" className="rounded-full overflow-hidden p-0 w-10 h-10 mx-0.5">
              <BoringAvatar
                size={40} // Restore original avatar size
                // Use email as primary identifier, fallback to name or empty string
                name={user?.email || user?.name || ''}
                variant="beam"
                colors={['#1D73F4', '#D4E4FA']} // Original agent colors
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500">{user?.email || 'user@example.com'}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {/* Update onClick to navigate to the new settings page */}
              <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
                Profile settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logoutAndClearCache} // Call the new function
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
