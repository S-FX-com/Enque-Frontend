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

type FieldErrors<T> = {
	[K in keyof T]?: string[];
};

type FieldValues<T> = {
	[K in keyof T]?: T[K];
};

export type FormState<T> = {
	success?: boolean;
	errors?: FieldErrors<T> & {
		_form?: string[];
	};
	message?: string;
	values?: FieldValues<T>;
};
