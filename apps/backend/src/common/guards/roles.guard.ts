import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // اگر برای مسیری نقشی تعریف نشده، همه دسترسی دارند
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      throw new ForbiddenException('کاربر احراز هویت نشده یا نقشی ندارد');
    }

    // منطق جدید: بررسی اینکه آیا کاربر حداقل یکی از نقش‌های مورد نیاز را دارد؟
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('شما سطح دسترسی لازم برای این بخش را ندارید');
    }
    
    return true;
  }
}