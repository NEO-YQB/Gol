# Vendor Mobile Release Checklist

## Android
- `android/key.properties` را از روی `android/key.properties.example` بساز.
- keystore نهایی release را خارج از repo نگه دار.
- `google-services.json` را برای package نهایی بررسی کن.
- خروجی نهایی را به صورت `AAB` بگیر.

## iOS
- Bundle Identifier نهایی را در Xcode بررسی کن.
- Signing Team و Provisioning Profile را ست کن.
- `GoogleService-Info.plist` را برای bundle نهایی بررسی کن.
- Push Notification capability را در Xcode فعال و بررسی کن.

## Store Assets
- آیکن نهایی اپ
- اسکرین‌شات موبایل
- توضیح کوتاه و کامل
- لینک privacy policy
- لینک support/contact

## Runtime
- `API_BASE_URL` باید production و با `https` باشد.
- نوتیفیکیشن‌ها روی build release تست شوند.
- تماس با مشتری روی دستگاه واقعی تست شود.
