import { Injectable } from '@nestjs/common';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseAdminService {
  private app: App | null = null;

  get messaging(): Messaging | null {
    const app = this.getApp();
    if (!app) {
      return null;
    }

    return getMessaging(app);
  }

  isConfigured() {
    return this.getApp() != null;
  }

  private getApp(): App | null {
    if (this.app) {
      return this.app;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    const existing = getApps().find((item) => item.name === 'vendor-mobile-push');
    if (existing) {
      this.app = existing;
      return this.app;
    }

    this.app = initializeApp(
      {
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      },
      'vendor-mobile-push',
    );

    return this.app;
  }
}
