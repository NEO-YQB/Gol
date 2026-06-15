import { Injectable } from '@nestjs/common';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

type FirebaseServiceAccountShape = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

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

    const serviceAccount = this.resolveServiceAccount();
    const projectId = serviceAccount?.projectId ?? process.env.FIREBASE_PROJECT_ID?.trim() ?? null;
    const clientEmail = serviceAccount?.clientEmail ?? process.env.FIREBASE_CLIENT_EMAIL?.trim() ?? null;
    const privateKey =
      serviceAccount?.privateKey ?? this.normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

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

  private resolveServiceAccount() {
    const encodedJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim();
    if (encodedJson) {
      try {
        const decoded = Buffer.from(encodedJson, 'base64').toString('utf8');
        return this.parseServiceAccountJson(decoded);
      } catch {
        return null;
      }
    }

    const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (inlineJson) {
      return this.parseServiceAccountJson(inlineJson);
    }

    return null;
  }

  private parseServiceAccountJson(rawJson: string) {
    try {
      const parsed = JSON.parse(rawJson) as FirebaseServiceAccountShape;
      const projectId = parsed.project_id?.trim();
      const clientEmail = parsed.client_email?.trim();
      const privateKey = this.normalizePrivateKey(parsed.private_key);

      if (!projectId || !clientEmail || !privateKey) {
        return null;
      }

      return {
        projectId,
        clientEmail,
        privateKey,
      };
    } catch {
      return null;
    }
  }

  private normalizePrivateKey(rawValue?: string) {
    if (!rawValue) {
      return null;
    }

    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    value = value
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .trim();

    if (!value.includes('BEGIN PRIVATE KEY') || !value.includes('END PRIVATE KEY')) {
      return null;
    }

    return value;
  }
}
