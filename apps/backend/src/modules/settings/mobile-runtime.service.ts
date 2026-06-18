import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ReverseGeocodeResponse = {
  formattedAddress: string;
  raw: unknown;
};

@Injectable()
export class MobileRuntimeService {
  constructor(private readonly configService: ConfigService) {}

  getPublicConfig() {
    return {
      map: {
        provider: 'map_ir',
        publicKey: this.configService.get<string>('MAP_IR_API_KEY')?.trim() ?? '',
        styleUrl:
            this.configService.get<string>('MAP_IR_STYLE_URL')?.trim() ||
            'https://map.ir/vector/styles/main/mapir-xyz-style.json',
        rtlPluginUrl:
            this.configService.get<string>('MAP_IR_RTL_PLUGIN_URL')?.trim() ||
            'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.4.0/mapbox-gl-rtl-text.js',
        reverseGeocodeMode: 'proxy',
      },
    };
  }

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResponse> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('مختصات ارسالی معتبر نیست.');
    }

    const reverseUrl =
      this.configService.get<string>('MAP_REVERSE_GEOCODE_URL')?.trim() ||
      'https://map.ir/reverse';
    const reverseKey =
      this.configService.get<string>('MAP_REVERSE_GEOCODE_KEY')?.trim() ||
      this.configService.get<string>('MAP_IR_API_KEY')?.trim() ||
      '';

    if (!reverseKey) {
      throw new InternalServerErrorException('کلید سرویس reverse geocode تنظیم نشده است.');
    }

    const url = new URL(reverseUrl);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': reverseKey,
      },
    });

    if (!response.ok) {
      throw new InternalServerErrorException('دریافت آدرس از سرویس نقشه ناموفق بود.');
    }

    const payload = (await response.json()) as Record<string, unknown>;
    return {
      formattedAddress: this.readReverseAddress(payload),
      raw: payload,
    };
  }

  private readReverseAddress(payload: Record<string, unknown>) {
    const candidates = [
      payload['address'],
      payload['formatted_address'],
      payload['address_compact'],
      payload['addressDetail'],
      payload['fullAddress'],
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    const address =
      payload['address'] && typeof payload['address'] === 'object'
        ? (payload['address'] as Record<string, unknown>)
        : null;
    if (address) {
      const parts = [
        address['region'],
        address['province'],
        address['county'],
        address['district'],
        address['city'],
        address['neighbourhood'],
        address['road'],
      ]
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);

      if (parts.length > 0) {
        return parts.join('، ');
      }
    }

    return '';
  }
}
