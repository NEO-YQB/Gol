import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { AppAbility } from '../guards/abilities.guard';

export const CHECK_ABILITY_KEY = 'check_ability';
export type AbilityHandler = (
  ability: AppAbility,
  context: ExecutionContext,
) => boolean | Promise<boolean>;

export const CheckAbilities = (...requirements: AbilityHandler[]) =>
  SetMetadata(CHECK_ABILITY_KEY, requirements);
