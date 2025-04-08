import { IAgent } from "./agent";
import { ITicket } from "./ticket";
import { IWorkspace } from "./workspace";

export interface IComment {
	content: string;
	agent: IAgent;
	ticket: ITicket;
	workspace: IWorkspace;
	created_at: string;
	updated_at: string;
}

export type ICreateComment = Pick<IComment, "content"> & {
	agent_id: number;
	ticket_id: number;
	workspace_id: number;
};

export type IUpdateComment = {};
