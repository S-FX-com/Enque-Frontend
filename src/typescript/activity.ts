import { IAgent } from "./agent";
import { ITicket } from "./ticket";

export interface IActivity {
	action: string;
	id: number;
	agent: IAgent;
	ticket: ITicket;
	created_at: string;
	updated_at: string;
}

export interface ICreateActivity {}

export interface IUpdateActivity {}
