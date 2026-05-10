import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark a route as public
 * Routes marked with @Public() will bypass JWT authentication and permission checks
 *
 * @example
 * @Public()
 * @Post('login')
 * login() { ... }
 *
 * @example
 * @Public()
 * @Post('register')
 * register() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
