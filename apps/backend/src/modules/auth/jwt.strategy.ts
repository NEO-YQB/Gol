import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: any) {
    // اطلاعاتی که اینجا برمی‌گردانیم در req.user قرار می‌گیرد
    return { 
      id: payload.sub, 
      phoneNumber: payload.phoneNumber, 
      roles: payload.roles // این اکنون یک آرایه است: ['ADMIN', 'CUSTOMER']
    };
  }
}