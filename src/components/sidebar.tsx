'use client';

import type React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Users2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { getAgentTeams, getTeams } from '@/services/team';
import type { Team } from '@/typescript/team';
import { Badge } from '@/components/ui/badge';
import type { IUser } from '@/typescript/user';
import { getTickets } from '@/services/ticket';

interface MyTeamsListProps {
  agentTeams: Team[] | undefined;
  isLoadingUser: boolean;
  user: IUser | null;
}

const MyTeamsList: React.FC<MyTeamsListProps> = ({ agentTeams, isLoadingUser, user }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (isLoadingUser || !user || !agentTeams || agentTeams.length === 0) {
    return null;
  }

  return (
    <nav className="space-y-1 px-4">
      {agentTeams.map(team => {
        const teamHref = `/tickets?teamId=${team.id}&teamName=${encodeURIComponent(team.name)}`;
        const currentTeamIdParam = searchParams.get('teamId');
        const isActive = pathname === '/tickets' && currentTeamIdParam === team.id.toString();
        const FallbackIcon = Users2;

        return (
          <Link
            key={team.id}
            href={teamHref}
            className={cn(
              'relative flex items-center justify-between space-x-2 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive
                ? 'font-medium text-primary dark:text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <div className="flex items-center space-x-2">
              <div className="relative h-5 w-5 flex items-center justify-center">
                {team.icon_name ? (
                  <span className="text-lg">{team.icon_name}</span>
                ) : (
                  <FallbackIcon fill={cn(isActive ? '#1D73F4' : '#2B3674')} />
                )}
              </div>
              <span>{team.name}</span>
            </div>
            {typeof team.ticket_count === 'number' && (
              <Badge
                variant={team.ticket_count > 0 ? 'secondary' : 'outline'}
                className={cn(
                  'h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs',
                  team.ticket_count === 0 && 'text-muted-foreground'
                )}
              >
                {team.ticket_count > 0 ? team.ticket_count : ''}
              </Badge>
            )}
            {isActive && (
              <div className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 transform rounded-full bg-primary"></div>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading: isLoadingUser } = useAuth();

  const { data: agentTeams } = useQuery<Team[], Error>({
    queryKey: ['agentTeams', user?.id, user?.role],
    queryFn: async () => {
      if (!user?.id) return Promise.resolve([]);

      // Si el usuario es admin, mostrar todos los teams del workspace
      if (user.role === 'admin') {
        return getTeams();
      } else {
        // Para agentes y managers, mostrar solo sus teams asignados
        return getAgentTeams(user.id);
      }
    },
    enabled: !!user?.id && !isLoadingUser,
    staleTime: 1000 * 60 * 10, // ✅ OPTIMIZADO: 10 minutos (era 5)
    refetchInterval: false, // ❌ REMOVIDO: No más polling - usar Socket.IO
    refetchOnWindowFocus: false, // ❌ REMOVIDO: Sin refetch al hacer foco
    refetchOnMount: false, // ❌ OPTIMIZADO: Solo si datos obsoletos
  });

  // Add query for all tickets count (excluding closed/resolved)
  const { data: allTicketsCount = 0 } = useQuery<number>({
    queryKey: ['ticketsCount', 'all'],
    queryFn: async () => {
      // Usar un límite muy alto para obtener todos los tickets
      const tickets = await getTickets({ limit: 10000 });
      // Filter out closed and resolved tickets to match My Teams behavior
      const activeTickets = tickets.filter(
        ticket => ticket.status !== 'Closed' && ticket.status !== 'Resolved'
      );
      return activeTickets.length || 0;
    },
    staleTime: 1000 * 60 * 10, // ✅ OPTIMIZADO: 10 minutos (era 5)
    refetchInterval: false, // ❌ REMOVIDO: No más polling - usar Socket.IO
    refetchOnWindowFocus: false, // ❌ REMOVIDO: Sin refetch al hacer foco
    refetchOnMount: false, // ❌ OPTIMIZADO: Solo si datos obsoletos
  });

  // Add query for my tickets count (excluding closed/resolved)
  const { data: myTicketsCount = 0 } = useQuery<number>({
    queryKey: ['ticketsCount', 'my', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      // Usar un límite muy alto para obtener todos los tickets
      const tickets = await getTickets({ limit: 10000 }, `/v1/tasks/assignee/${user.id}`);
      // Filter out closed and resolved tickets to match My Teams behavior
      const activeTickets = tickets.filter(
        ticket => ticket.status !== 'Closed' && ticket.status !== 'Resolved'
      );
      return activeTickets.length || 0;
    },
    enabled: !!user?.id && !isLoadingUser,
    staleTime: 1000 * 60 * 10, // ✅ OPTIMIZADO: 10 minutos (era 5)
    refetchInterval: false, // ❌ REMOVIDO: No más polling - usar Socket.IO
    refetchOnWindowFocus: false, // ❌ REMOVIDO: Sin refetch al hacer foco
    refetchOnMount: false, // ❌ OPTIMIZADO: Solo si datos obsoletos
  });

  const mainItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: ({ fill = '#2B3674' }: { fill: string }) => (
        <svg
          width="18"
          height="18"
          viewBox="0 0 22 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8.60606 19.2992V13.295H13.3886V19.2992C13.3886 19.9596 13.9267 20.5 14.5843 20.5H18.1712C18.8288 20.5 19.3668 19.9596 19.3668 19.2992V10.8933H21.3994C21.9494 10.8933 22.2125 10.2088 21.794 9.84854L11.7984 0.806214C11.3441 0.397929 10.6506 0.397929 10.1963 0.806214L0.200691 9.84854C-0.205827 10.2088 0.0452573 10.8933 0.595253 10.8933H2.62785V19.2992C2.62785 19.9596 3.16588 20.5 3.82349 20.5H7.41042C8.06802 20.5 8.60606 19.9596 8.60606 19.2992Z"
            fill={fill}
          />
        </svg>
      ),
    },
    {
      title: 'All Tickets',
      href: '/tickets',
      icon: ({ fill = '#2B3674' }: { fill: string }) => (
        <svg
          width="18"
          height="18"
          viewBox="0 0 22 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0.769231 0.5H20.7692L21.5385 1.26923V11.8138C21.0973 11.3132 20.5777 10.8877 20 10.5538V2.03846H1.53846V14.3462H5.38462L6.15385 15.1154V17.8738L9.45538 14.5708L10 14.3462H10.9631C10.8359 14.8395 10.7713 15.3523 10.7692 15.8846H10.3185L5.92923 20.2754L4.61538 19.7308V15.8846H0.769231L0 15.1154V1.26923L0.769231 0.5Z"
            fill={fill}
          />
          <path
            d="M16.923 11.2693C15.6989 11.2693 14.525 11.7555 13.6594 12.6211C12.7939 13.4867 12.3076 14.6606 12.3076 15.8847C12.3076 17.1087 12.7939 18.2827 13.6594 19.1482C14.525 20.0138 15.6989 20.5001 16.923 20.5001C18.1471 20.5001 19.321 20.0138 20.1866 19.1482C21.0521 18.2827 21.5384 17.1087 21.5384 15.8847C21.5384 14.6606 21.0521 13.4867 20.1866 12.6211C19.321 11.7555 18.1471 11.2693 16.923 11.2693Z"
            fill={fill}
          />
        </svg>
      ),
      ticketCount: allTicketsCount,
    },
    {
      title: 'My Tickets',
      href: '/my-tickets',
      icon: ({ fill = '#2B3674' }: { fill: string }) => (
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 14H11V16H4V14ZM4 10H14V12H4V10ZM4 6H14V8H4V6ZM16 2H11.82C11.4 0.84 10.3 0 9 0C7.7 0 6.6 0.84 6.18 2H2C1.86 2 1.73 2.01 1.6 2.04C1.28158 2.10698 0.984181 2.25027 0.733356 2.45755C0.48253 2.66483 0.285777 2.9299 0.16 3.23C0.0600001 3.46 0 3.72 0 4V18C0 18.27 0.0600001 18.54 0.16 18.78C0.26 19.02 0.41 19.23 0.59 19.42C0.86 19.69 1.21 19.89 1.6 19.97C1.73 19.99 1.86 20 2 20H16C17.1 20 18 19.1 18 18V4C18 2.9 17.1 2 16 2ZM9 1.75C9.41 1.75 9.75 2.09 9.75 2.5C9.75 2.91 9.41 3.25 9 3.25C8.59 3.25 8.25 2.91 8.25 2.5C8.25 2.09 8.59 1.75 9 1.75ZM16 18H2V4H16V18Z"
            fill={fill}
          />
        </svg>
      ),
      ticketCount: myTicketsCount,
    },
    {
      title: 'Users & Companies',
      href: '/users-companies',
      icon: ({ fill = '#2B3674' }: { fill: string }) => (
        <svg
          width="18"
          height="18"
          viewBox="0 0 22 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.6 13.3333H15.4V15.5556H17.6M17.6 8.88889H15.4V11.1111H17.6M19.8 17.7778H11V15.5556H13.2V13.3333H11V11.1111H13.2V8.88889H11V6.66667H19.8M8.8 4.44444H6.6V2.22222H8.8M8.8 8.88889H6.6V6.66667H8.8M8.8 13.3333H6.6V11.1111H8.8M8.8 17.7778H6.6V15.5556H8.8M4.4 4.44444H2.2V2.22222H4.4M4.4 8.88889H2.2V6.66667H4.4M4.4 13.3333H2.2V11.1111H4.4M4.4 17.7778H2.2V15.5556H4.4M11 4.44444V0H0V20H22V4.44444H11Z"
            fill={fill}
          />
        </svg>
      ),
    },
    {
      title: 'Reporting',
      href: '/reports',
      icon: ({ fill = '#2B3674' }: { fill: string }) => (
        <svg
          width="18"
          height="18"
          viewBox="0 0 22 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M2.21429 21.5H21.5V20.0714H2.92857V1.5H1.5V20.7857L2.21429 21.5ZM4.35714 17.9286V6.5L5.07143 5.78571H7.92857L8.64286 6.5V17.9286L7.92857 18.6429H5.07143L4.35714 17.9286ZM7.21429 17.2143V7.21429H5.78571V17.2143H7.21429ZM15.7857 3.64286V17.9286L16.5 18.6429H19.3571L20.0714 17.9286V3.64286L19.3571 2.92857H16.5L15.7857 3.64286ZM18.6429 4.35714V17.2143H17.2143V4.35714H18.6429ZM10.0714 17.9286V9.35714L10.7857 8.64286H13.6429L14.3571 9.35714V17.9286L13.6429 18.6429H10.7857L10.0714 17.9286ZM12.9286 17.2143V10.0714H11.5V17.2143H12.9286Z"
            fill={fill}
          />
        </svg>
      ),
    },
  ];

  const bottomItems = [
    {
      title: 'Configuration',
      href: '/configuration',
      icon: ({ fill = '#2B3674' }: { fill: string }) => (
        <svg
          width="20"
          height="20"
          viewBox="0 0 23 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11.0003 7.609C10.0625 7.609 9.16319 7.98152 8.50011 8.6446C7.83703 9.30768 7.46451 10.207 7.46451 11.1448C7.46451 12.0825 7.83703 12.9818 8.50011 13.6449C9.16319 14.308 10.0625 14.6805 11.0003 14.6805C11.938 14.6805 12.8373 14.308 13.5004 13.6449C14.1635 12.9818 14.536 12.0825 14.536 11.1448C14.536 10.207 14.1635 9.30768 13.5004 8.6446C12.8373 7.98152 11.938 7.609 11.0003 7.609ZM8.87881 11.1448C8.87881 10.5821 9.10232 10.0425 9.50017 9.64466C9.89802 9.24681 10.4376 9.0233 11.0003 9.0233C11.5629 9.0233 12.1025 9.24681 12.5004 9.64466C12.8982 10.0425 13.1217 10.5821 13.1217 11.1448C13.1217 11.7074 12.8982 12.247 12.5004 12.6449C12.1025 13.0427 11.5629 13.2662 11.0003 13.2662C10.4376 13.2662 9.89802 13.0427 9.50017 12.6449C9.10232 12.247 8.87881 11.7074 8.87881 11.1448ZM8.76567 20.7818C9.49757 20.9565 10.2479 21.0449 11.0003 21.0449C11.752 21.044 12.501 20.955 13.232 20.7797C13.442 20.73 13.6315 20.6166 13.7745 20.4551C13.9176 20.2936 14.0072 20.0918 14.0311 19.8774L14.1966 18.3711C14.2124 18.2068 14.2671 18.0485 14.3563 17.9095C14.4454 17.7705 14.5664 17.6547 14.7092 17.5718C14.852 17.4888 15.0125 17.4411 15.1774 17.4325C15.3424 17.424 15.5069 17.4548 15.6576 17.5226L17.04 18.1279C17.2379 18.2152 17.4581 18.2386 17.6699 18.1949C17.8817 18.1511 18.0746 18.0424 18.2217 17.8839C19.2431 16.7832 20.0056 15.4681 20.4535 14.0349C20.5174 13.8275 20.5154 13.6055 20.4476 13.3993C20.3799 13.1932 20.2497 13.0132 20.0751 12.8843L18.8525 11.9827C18.7188 11.8855 18.61 11.758 18.5351 11.6107C18.4602 11.4633 18.4213 11.3003 18.4215 11.135C18.4217 10.9697 18.461 10.8068 18.5363 10.6597C18.6116 10.5125 18.7207 10.3853 18.8546 10.2884L20.0709 9.39032C20.2469 9.26217 20.3783 9.08197 20.4464 8.87516C20.5146 8.66834 20.516 8.44535 20.4506 8.23766C20.0037 6.80385 19.2408 5.48855 18.2182 4.38864C18.0703 4.23055 17.8771 4.12219 17.665 4.0785C17.453 4.03481 17.2327 4.05793 17.0344 4.14467L15.6583 4.74999C15.5074 4.81574 15.3433 4.84508 15.179 4.83563C15.0147 4.82618 14.855 4.77821 14.7127 4.6956C14.5704 4.61299 14.4495 4.49805 14.3599 4.36009C14.2702 4.22212 14.2143 4.065 14.1966 3.90141L14.0297 2.40225C14.006 2.18534 13.915 1.98128 13.7696 1.8186C13.6241 1.65593 13.4315 1.54278 13.2186 1.49498C12.4926 1.33209 11.7514 1.24605 11.0073 1.23828C10.2589 1.24717 9.51342 1.33319 8.78264 1.49498C8.56957 1.54168 8.37659 1.65422 8.23102 1.81666C8.08545 1.97911 7.99468 2.18323 7.97154 2.40013L7.80395 3.9007C7.78564 4.06454 7.72922 4.2218 7.63921 4.35991C7.5492 4.49802 7.4281 4.61314 7.28561 4.69603C7.14312 4.77893 6.98319 4.82731 6.81864 4.83729C6.65409 4.84728 6.48949 4.81859 6.33802 4.75353L4.96191 4.1475C4.76341 4.06286 4.5437 4.04121 4.3325 4.08547C4.1213 4.12974 3.92878 4.23778 3.78096 4.395C2.75826 5.49604 1.99476 6.81187 1.54637 8.24615C1.48278 8.45335 1.48509 8.6752 1.55299 8.88103C1.62088 9.08687 1.75101 9.26655 1.9254 9.39527L3.14524 10.2948C3.27812 10.3925 3.38614 10.5202 3.4606 10.6674C3.53505 10.8146 3.57384 10.9773 3.57384 11.1423C3.57384 11.3073 3.53505 11.4699 3.4606 11.6171C3.38614 11.7644 3.27812 11.892 3.14524 11.9898L1.9254 12.8914C1.75043 13.0205 1.61999 13.2008 1.55219 13.4073C1.48439 13.6139 1.48261 13.8365 1.54708 14.0441C1.99509 15.4794 2.75861 16.7962 3.78167 17.898C3.87898 18.0025 3.9969 18.0857 4.12799 18.1423C4.25908 18.1989 4.40049 18.2277 4.54327 18.2269C4.68683 18.2269 4.82896 18.1972 4.9612 18.1399L6.34368 17.5325C6.49447 17.4673 6.65844 17.4384 6.82241 17.4482C6.98638 17.4579 7.14579 17.506 7.28781 17.5885C7.42983 17.671 7.55051 17.7857 7.64015 17.9234C7.72979 18.061 7.78589 18.2178 7.80395 18.381L7.97013 19.8844C7.99465 20.0976 8.08413 20.2981 8.22643 20.4588C8.36874 20.6194 8.55699 20.7317 8.76567 20.7818ZM12.6557 19.463C11.5647 19.6875 10.4394 19.6875 9.34836 19.463L9.21047 18.2325C9.14306 17.6306 8.85603 17.0747 8.40432 16.6711C8.05082 16.3594 7.61631 16.1542 7.15103 16.0791C6.68576 16.004 6.20873 16.0622 5.77513 16.2469L4.63945 16.7419C3.90629 15.9033 3.34245 14.9308 2.97906 13.8779L3.98604 13.134C4.29714 12.9047 4.55003 12.6056 4.72431 12.2607C4.8986 11.9158 4.9894 11.5347 4.9894 11.1483C4.9894 10.7618 4.8986 10.3808 4.72431 10.0359C4.55003 9.69099 4.29714 9.39186 3.98604 9.16261L2.98118 8.4201C3.3449 7.36822 3.90873 6.39665 4.64157 5.55897L5.77301 6.05398C6.08486 6.19169 6.42212 6.26251 6.76302 6.26188C7.3701 6.25998 7.95531 6.03502 8.40735 5.62979C8.85938 5.22456 9.14672 4.66732 9.21471 4.06406L9.3519 2.82866C9.89923 2.72259 10.4551 2.66602 11.0116 2.65895C11.5646 2.66602 12.1162 2.72259 12.6592 2.82866L12.7908 4.05911C12.8563 4.66276 13.1426 5.22088 13.5948 5.62615C13.9489 5.93909 14.3845 6.14508 14.8511 6.22019C15.3176 6.2953 15.7959 6.23644 16.2304 6.05044L17.3618 5.55544C18.0952 6.39321 18.6595 7.36503 19.0236 8.41728L18.0173 9.15696C17.7046 9.3854 17.4502 9.68443 17.2749 10.0297C17.0995 10.375 17.0081 10.7568 17.0081 11.144C17.0081 11.5313 17.0995 11.9131 17.2749 12.2584C17.4502 12.6037 17.7046 12.9027 18.0173 13.1311L19.0229 13.8737C18.6579 14.9236 18.095 15.8939 17.3646 16.732L16.2332 16.237C15.8791 16.0794 15.4928 16.0079 15.1058 16.0282C14.7188 16.0485 14.3421 16.1602 14.0065 16.354C13.6709 16.5478 13.3859 16.8182 13.1749 17.1432C12.9638 17.4683 12.8327 17.8386 12.7922 18.224L12.6557 19.463Z"
            fill={fill}
          />
        </svg>
      ),
      roleRestriction: ['admin'],
    },
  ];

  return (
    <div className="flex h-screen w-64 flex-col bg-white dark:bg-black py-6">
      <div className="flex items-center px-6 mb-6">
        <Link href="/dashboard">
          <Image src="/enque.png" alt="Enque Logo" width={100} height={33} priority />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="space-y-1 px-4">
          {mainItems.map(item => {
            // Lógica especial para "All Tickets": solo activo si no hay teamId en query params
            const isActive =
              item.title === 'All Tickets'
                ? pathname === item.href && !searchParams.get('teamId')
                : pathname === item.href;
            const IconComponent = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex items-center justify-between space-x-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'font-medium text-primary dark:text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <div className="flex items-center space-x-2">
                  <div className="relative h-5 w-5">
                    <IconComponent fill={cn(isActive ? '#1D73F4' : '#2B3674')} />
                  </div>
                  <span>{item.title}</span>
                </div>
                {typeof item.ticketCount === 'number' && item.ticketCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
                  >
                    {item.ticketCount >= 100 ? '99+' : item.ticketCount}
                  </Badge>
                )}
                {isActive && (
                  <div className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 transform rounded-full bg-primary"></div>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6">
          <h2
            className="mb-2 px-4 text-base font-semibold tracking-tight"
            style={{ color: '#2b3674' }}
          >
            My Teams
          </h2>
          <Suspense fallback={<div className="px-4 text-sm text-slate-500">Loading teams...</div>}>
            <MyTeamsList agentTeams={agentTeams} isLoadingUser={isLoadingUser} user={user} />
          </Suspense>
        </div>
      </div>
      <div className="mt-auto flex flex-col px-4 py-4">
        <nav className="space-y-1 w-full">
          {bottomItems.map(item => {
            const isActive = pathname === item.href;
            const IconComponent = item.icon;

            // Skip rendering if item has role restriction and user doesn't have the required role
            if (
              item.roleRestriction &&
              (!user?.role || !item.roleRestriction.includes(user.role))
            ) {
              return null;
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex items-center space-x-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'font-medium text-primary dark:text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <div className="relative h-5 w-5">
                  <IconComponent fill={cn(isActive ? '#1D73F4' : '#2B3674')} />
                </div>
                <span>{item.title}</span>
                {isActive && (
                  <div className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 transform rounded-full bg-primary"></div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-64 flex-col bg-white dark:bg-black py-6 px-4">
          Loading...
        </div>
      }
    >
      <SidebarContent />
    </Suspense>
  );
}
