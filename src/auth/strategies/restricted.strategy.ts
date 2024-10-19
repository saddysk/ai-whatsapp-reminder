import { isEmpty } from 'lodash';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { AppConfig } from 'src/config/config';

const CONFIG = AppConfig();

/**
 * Stretegy to secure internal endpoints
 */
@Injectable()
export class RestrictedStrategy extends PassportStrategy(
  Strategy,
  'restricted',
) {
  constructor() {
    super();
  }

  async validate(plainToken: string) {
    if (isEmpty(plainToken)) {
      throw new UnauthorizedException('Token is missing');
    }

    if (CONFIG.INTERNAL_API_TOKEN !== plainToken) {
      throw new UnauthorizedException('Invalid token');
    }

    return { status: 'authenticated' };
  }
}
