import { IAgent } from "./agent";
import { ITicket } from "./ticket";

export interface IComment {
	content: string;
	agent: IAgent;
	ticket: ITicket;
	created_at: string;
	updated_at: string;
}

export interface ICreateComment {}

export interface IUpdateComment {}
