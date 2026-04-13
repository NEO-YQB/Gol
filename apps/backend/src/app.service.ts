import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

@Injectable()
export class AppService {

  getHello(): string {
    return 'Hello Flower Market!';
  }
}
