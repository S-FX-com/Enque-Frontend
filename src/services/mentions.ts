import { apiClient } from '@/lib/api';
import type { Agent } from '@/typescript/agent';
import type { IUser } from '@/typescript/user';

export interface MentionUser {
  id: number;
  name: string;
  email: string;
  type: 'agent' | 'user';
  role?: string;
}

export async function getWorkspaceMentions(): Promise<MentionUser[]> {
  console.log('🚀 Fetching workspace mentions...');
  try {
    const [agentsResponse, usersResponse] = await Promise.all([
      apiClient.get<Agent[]>('/agents/'),
      apiClient.get<IUser[]>('/users/')
    ]);

    console.log('📡 API responses:', { 
      agents: agentsResponse.data?.length, 
      users: usersResponse.data?.length 
    });

    const mentions: MentionUser[] = [];

    // Agregar agentes
    if (agentsResponse.data) {
      agentsResponse.data.forEach((agent: Agent) => {
        mentions.push({
          id: agent.id,
          name: agent.name,
          email: agent.email,
          type: 'agent',
          role: agent.role
        });
      });
    }

    // Agregar usuarios (clientes)
    if (usersResponse.data) {
      usersResponse.data.forEach((user: IUser) => {
        mentions.push({
          id: user.id,
          name: user.name,
          email: user.email,
          type: 'user'
        });
      });
    }

    // Ordenar por nombre
    const sortedMentions = mentions.sort((a, b) => a.name.localeCompare(b.name));
    console.log('✅ Mentions loaded:', sortedMentions.length, sortedMentions);
    return sortedMentions;
  } catch (error) {
    console.error('❌ Error fetching workspace mentions:', error);
    return [];
  }
} 