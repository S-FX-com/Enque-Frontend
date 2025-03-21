export type Errors = Record<string, string>;

export type ServiceResponse<T> =
	| {
			success: true;
			message?: string;
			data?: T;
	  }
	| {
			success: false;
			message?: string;
			errors?: Errors;
	  };
