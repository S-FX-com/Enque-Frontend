export type TokenTypes = "Bearer";

export interface IToken {
	access_token: string;
	token_type: TokenTypes;
	expires_at: string;
}
