import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedRequest } from '../common/http.types';
import {
  acceptInviteBodySchema,
  authResponseSchema,
  loginBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  registerBodySchema,
  successSchema,
  currentContextSchema,
} from '../common/swagger.schemas';
import { AuthenticatedUser } from '../workspace/workspace.types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiOperation({ summary: 'Register a company workspace and owner account' })
  @ApiBody({ schema: registerBodySchema })
  @ApiCreatedResponse({ schema: authResponseSchema })
  @ApiConflictResponse({ description: 'Company slug or domain is already in use' })
  @Post('register')
  register(@Body() body: unknown) {
    return this.authService.register(body);
  }

  @Public()
  @ApiOperation({ summary: 'Log in to a company workspace' })
  @ApiBody({ schema: loginBodySchema })
  @ApiOkResponse({ schema: authResponseSchema })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or inactive member' })
  @HttpCode(200)
  @Post('login')
  login(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.authService.login(body, request);
  }

  @Public()
  @ApiOperation({ summary: 'Rotate an access token using a refresh token' })
  @ApiBody({ schema: refreshBodySchema })
  @ApiOkResponse({ schema: authResponseSchema })
  @ApiUnauthorizedResponse({ description: 'Invalid or revoked refresh token' })
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() body: unknown) {
    return this.authService.refresh(body);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Log out and revoke refresh token sessions' })
  @ApiBody({ schema: logoutBodySchema, required: false })
  @ApiOkResponse({ schema: successSchema })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @HttpCode(200)
  @Post('logout')
  logout(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(body, user);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the current user and company workspace' })
  @ApiOkResponse({ schema: currentContextSchema })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @Public()
  @ApiOperation({ summary: 'Accept a workspace invite and set a password' })
  @ApiBody({ schema: acceptInviteBodySchema })
  @ApiCreatedResponse({ schema: authResponseSchema })
  @ApiConflictResponse({ description: 'Invitation was expired or already accepted' })
  @Post('accept-invite')
  acceptInvite(@Body() body: unknown) {
    return this.authService.acceptInvite(body);
  }
}
