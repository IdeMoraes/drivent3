import { ApplicationError } from '@/protocols';

export function cannotListHotelsError(): ApplicationError {
	return {
		name: 'CannotListHotelsError',
		message: 'Can not list hotels!',
	};
}
