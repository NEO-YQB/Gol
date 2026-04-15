import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory } from '../../modules/auth/ability.factory';
import { CHECK_ABILITY_KEY } from '../decorators/check-abilities.decorator';
import { PureAbility } from '@casl/ability';
import { PrismaQuery, Subjects } from '@casl/prisma';
import { AbilityHandler } from '../decorators/check-abilities.decorator';

// تعریف نوع Ability برای پروژه ما
export type AppAbility = PureAbility<[string, Subjects<PrismaQuery<any>>]>;

@Injectable()
export class AbilitiesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private abilityFactory: AbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredAbilities = this.reflector.getAllAndOverride<AbilityHandler[]>(
      CHECK_ABILITY_KEY,
      [context.getHandler(), context.getClass()],
    );

    // اگر هیچ قابلیتی برای مسیر تعریف نشده، دسترسی آزاد است
    if (!requiredAbilities) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // اطلاعات کاربر از JWTAuthGuard می‌آید

    if (!user) {
      throw new ForbiddenException('کاربر احراز هویت نشده است');
    }

    const ability = await this.abilityFactory.createForUser(user);

    for (const check of requiredAbilities) {
      const allowed = await check(ability, context);
      if (!allowed) {
        throw new ForbiddenException('شما دسترسی لازم برای انجام این عملیات را ندارید');
      }
    }

    return true;
  }
}
