'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BellIcon,
  HelpCircleIcon,
  LogOutIcon,
  SearchIcon,
  PlusCircle,
  Trash2Icon,
} from 'lucide-react';
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
} from '@/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { handleLogout, type UserSession } from '@/lib/auth';
import BoringAvatar from 'boring-avatars';
import { ModeToggle } from './mode-toggle';
import {
  getNotifications,
  clearAllNotifications,
  showNotificationToast,
} from '@/services/activity';
import type { Activity } from '@/typescript/activity';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentAvatar } from '@/hooks/use-agent-avatar';
import { getAgentById } from '@/services/agent';
import { useDebounce } from '@/hooks/use-debounce';
import { getTickets } from '@/services/ticket';
import type { ITicket } from '@/typescript/ticket';
import { formatRelativeTime, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
  const [isClearingNotifications, setIsClearingNotifications] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState<number | null>(null);
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const debouncedSearchFilter = useDebounce(searchInput, 300);

  useEffect(() => {
    if (searchInput.length >= 2) {
      setIsSearchOpen(true);
    } else {
      setIsSearchOpen(false);
    }
  }, [searchInput]);

  // Fetch tickets for search
  const { data: searchTicketsData = [] } = useQuery<ITicket[]>({
    queryKey: ['tickets', 'search', debouncedSearchFilter],
    queryFn: async () => {
      if (!debouncedSearchFilter || debouncedSearchFilter.length < 2) return [];
      const tickets = await getTickets({ skip: 0, limit: 10 });
      return tickets.filter(ticket =>
        ticket.title.toLowerCase().includes(debouncedSearchFilter.toLowerCase())
      );
    },
    enabled: !!debouncedSearchFilter && debouncedSearchFilter.length >= 2,
    staleTime: 1000 * 30, // Cache for 30 seconds
  });

  // Filter and limit search results
  const filteredSearchResults = useMemo(() => {
    return searchTicketsData.slice(0, 8); // Limit to 8 results
  }, [searchTicketsData]);

  // Get updated user data from backend (for fresh avatar and other data)
  const { data: updatedUserData } = useQuery({
    queryKey: ['agent', user?.id],
    queryFn: () => getAgentById(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  // Use updated data from backend if available, otherwise fall back to session data
  const currentUserData = updatedUserData || user;

  // Convert UserSession to Agent-like object for avatar display
  const userAsAgent = currentUserData
    ? {
        id: currentUserData.id,
        name: currentUserData.name,
        email: currentUserData.email,
        role: currentUserData.role as 'admin' | 'agent' | 'manager',
        is_active: true,
        workspace_id: currentUserData.workspace_id,
        job_title: currentUserData.job_title,
        phone_number: currentUserData.phone_number,
        email_signature: currentUserData.email_signature,
        avatar: currentUserData.avatar,
        created_at: '',
        updated_at: '',
      }
    : null;

  // Get current user data for avatar display
  const { AvatarComponent: UserAvatarComponent } = useAgentAvatar({
    agent: userAsAgent,
    size: 40,
    variant: 'beam',
    className: 'border',
  });

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

  // Comprobar si hay nuevas notificaciones y mostrar toast para la más reciente
  useEffect(() => {
    if (notifications.length > 0) {
      const newestNotification = notifications[0]; // Las notificaciones vienen ordenadas con la más reciente primero

      // Comprobar si esta notificación es nueva (no mostrada anteriormente)
      if (lastNotificationId === null || newestNotification.id > lastNotificationId) {
        // Actualizar el ID de la última notificación
        setLastNotificationId(newestNotification.id);

        // Mostrar notificación toast solo para las nuevas
        if (lastNotificationId !== null) {
          showNotificationToast(newestNotification);
        }
      }
    }
  }, [notifications, lastNotificationId]);

  // Function to clear all notifications
  const handleClearAllNotifications = async () => {
    if (isClearingNotifications) return;

    try {
      setIsClearingNotifications(true);
      await clearAllNotifications();
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    } finally {
      setIsClearingNotifications(false);
    }
  };

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
      <div className="flex flex-col gap-3">
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
              <PlusCircle className="mr-2 h-4 w-4" />
              {pathname === '/configuration/teams'
                ? 'New Team'
                : pathname === '/configuration/categories'
                  ? 'New Category'
                  : 'New'}
            </Button>
          )}
        </div>
      </div>

      {/* Right side controls (Search, Icons, User Menu) */}
      <div className="flex items-center gap-0.5 px-1 py-1 bg-white rounded-full border border-slate-100">
        <Popover
          open={isSearchOpen}
          onOpenChange={open => {
            if (!open) {
              setIsSearchOpen(false);
            }
          }}
        >
          <PopoverTrigger asChild>
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                type="search"
                placeholder="Search tickets..."
                value={searchInput}
                onChange={e => {
                  setSearchInput(e.target.value);
                }}
                onFocus={() => {}}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setIsSearchOpen(false);
                    setSearchInput('');
                  }
                }}
                className="w-56 pl-8 h-9 bg-[#F4F7FE] border-0 rounded-full focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-96 p-0 max-h-96"
            align="start"
            onOpenAutoFocus={e => e.preventDefault()}
          >
            <div className="p-2">
              <div className="text-sm font-medium text-muted-foreground mb-2 px-2">
                Search Results{' '}
                {filteredSearchResults.length > 0 && `(${filteredSearchResults.length})`}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {filteredSearchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {debouncedSearchFilter.length < 2
                      ? 'Type at least 2 characters to search...'
                      : 'No tickets found matching your search.'}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredSearchResults.map(ticket => (
                      <div
                        key={ticket.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => {
                          router.push(`/tickets/${ticket.id}`);
                          setIsSearchOpen(false);
                          setSearchInput('');
                        }}
                      >
                        <div className="flex-shrink-0">
                          <div className="relative flex h-2 w-2">
                            <span
                              className={cn(
                                'absolute inline-flex h-full w-full rounded-full',
                                ticket.status === 'Open' && 'bg-green-500',
                                ticket.status === 'Closed' && 'bg-slate-500',
                                ticket.status === 'Unread' && 'bg-blue-500',
                                ticket.status === 'With User' && 'bg-purple-500',
                                ticket.status === 'In Progress' && 'bg-orange-500'
                              )}
                            />
                            {ticket.status === 'Unread' && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">#{ticket.id}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                ticket.priority === 'Low' &&
                                  'bg-slate-100 text-slate-600 border-slate-300',
                                ticket.priority === 'Medium' &&
                                  'bg-green-100 text-green-800 border-green-300',
                                ticket.priority === 'High' &&
                                  'bg-yellow-100 text-yellow-800 border-yellow-300',
                                ticket.priority === 'Critical' &&
                                  'bg-red-100 text-red-800 border-red-300'
                              )}
                            >
                              {ticket.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground truncate mb-1">{ticket.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="capitalize">{ticket.status}</span>
                            <span>•</span>
                            <span>{formatRelativeTime(ticket.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
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
                  <div className="p-4 font-medium border-b flex justify-between items-center">
                    <span>Notifications</span>
                    {notifications.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"
                        onClick={handleClearAllNotifications}
                        disabled={isClearingNotifications}
                      >
                        <Trash2Icon size={16} />
                        <span className="sr-only">Clear all notifications</span>
                      </Button>
                    )}
                  </div>
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
                          const isComment = notification.source_type === 'Comment';
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
                            <div key={notification.id} className="flex items-start gap-3">
                              <BoringAvatar
                                size={32}
                                name={avatarName}
                                variant="beam"
                                colors={avatarColors} // Apply correct color palette
                              />
                              <div className="text-sm flex-1">
                                <p>
                                  <span className="font-medium">{displayName}</span>{' '}
                                  {/* Show different text based on notification type */}
                                  {isTicketCreation
                                    ? 'logged a new ticket'
                                    : isComment
                                      ? 'commented on ticket'
                                      : notification.action}
                                  {/* Display ticket ID for both tickets and comments */}
                                  {(isTicketCreation || isComment) && notification.source_id && (
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

                          // Wrap with Link for both tickets and comments
                          return (isTicketCreation || isComment) && notification.source_id ? (
                            <Link
                              href={`/tickets/${notification.source_id}`}
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
            {/* Use the UserAvatarComponent instead of BoringAvatar */}
            <Button variant="ghost" className="rounded-full overflow-hidden p-0 w-10 h-10 mx-0.5">
              {UserAvatarComponent}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{currentUserData?.name || 'User'}</p>
                <p className="text-xs text-slate-500">
                  {currentUserData?.email || 'user@example.com'}
                </p>
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
