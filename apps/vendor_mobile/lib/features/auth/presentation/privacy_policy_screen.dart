import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('سیاست حفظ حریم خصوصی'),
          centerTitle: true,
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // لوگو
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x221F6A52),
                        blurRadius: 24,
                        offset: Offset(0, 12),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Image.asset(
                    'assets/icon/icon.png',
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text(
                'فروشندگان گلینو',
                textAlign: TextAlign.center,
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              // متن سیاست حریم خصوصی
              _buildSection(
                theme,
                'مقدمه',
                'سیاست حفظ حریم خصوصی توضیح می‌دهد که چگونه اطلاعات شخصی شما را در برنامه فروشنده Golino جمع‌آوری، استفاده و محافظت می‌کنیم. با استفاده از این برنامه، شما با شرایط این سیاست موافقت می‌کنید.',
              ),
              _buildSection(
                theme,
                'جمع‌آوری اطلاعات',
                'ما اطلاعات زیر را از شما جمع‌آوری می‌کنیم:\n\n'
                    '• شماره موبایل برای احراز هویت و ورود\n'
                    '• نام فروشگاه و اطلاعات تماس\n'
                    '• آدرس فروشگاه برای ارسال سفارشات\n'
                    '• تصاویر محصولات برای نمایش در فروشگاه\n'
                    '• تصاویر احراز هویت (کارت ملی) و جواز فعالیت\n'
                    '• اطلاعات سفارشات و تراکنش‌های مالی\n'
                    '• اطلاعات دستگاه (مدل، سیستم‌عامل، آدرس IP)',
              ),
              _buildSection(
                theme,
                'استفاده از اطلاعات',
                'اطلاعات جمع‌آوری شده صرفاً برای اهداف زیر استفاده می‌شوند:\n\n'
                    '• مدیریت حساب کاربری و فروشگاه شما\n'
                    '• پردازش و مدیریت سفارشات\n'
                    '• بهبود تجربه کاربری و خدمات\n'
                    '• ارسال اعلان‌های مهم مربوط به سفارشات\n'
                    '• ارتباط با شما در مورد به‌روزرسانی‌ها و تغییرات\n'
                    '• جلوگیری از تقلب و سوءاستفاده',
              ),
              _buildSection(
                theme,
                'اشتراک‌گذاری اطلاعات',
                'ما اطلاعات شخصی شما را با اشخاص ثالث به اشتراک نمی‌گذاریم، مگر در موارد زیر:\n\n'
                    '• با رضایت صریح شما\n'
                    '• برای ارائه خدمات ارسال (مانند پیک یا پست)\n'
                    '• در صورت الزام قانونی\n'
                    '• برای محافظت از حقوق و امنیت ما و کاربران',
              ),
              _buildSection(
                theme,
                'امنیت اطلاعات',
                'ما از تدابیر امنیتی مناسب برای محافظت از اطلاعات شما استفاده می‌کنیم:\n\n'
                    '• رمزنگاری اطلاعات حساس در حالت انتقال و ذخیره\n'
                    '• دسترسی محدود به اطلاعات شخصی\n'
                    '• نظارت مداوم بر فعالیت‌های مشکوک\n'
                    '• به‌روزرسانی منظم تدابیر امنیتی',
              ),
              _buildSection(
                theme,
                'حقوق شما',
                'شما حق دارید:\n\n'
                    '• به اطلاعات شخصی خود دسترسی داشته باشید\n'
                    '• اطلاعات نادرست را اصلاح کنید\n'
                    '• درخواست حذف اطلاعات خود را بدهید\n'
                    '• از دریافت اعلان‌های تبلیغاتی انصراف دهید\n'
                    '• در مورد نحوه پردازش اطلاعات خود سؤال کنید',
              ),
              _buildSection(
                theme,
                'کوکی‌ها و فناوری‌های ردیابی',
                'ما ممکن است از کوکی‌ها و فناوری‌های مشابه برای بهبود تجربه کاربری استفاده کنیم. این فناوری‌ها به ما کمک می‌کنند تا:\n\n'
                    '• تنظیمات شما را ذخیره کنیم\n'
                    '• عملکرد برنامه را بهبود دهیم\n'
                    '• ترافیک و الگوهای استفاده را تحلیل کنیم',
              ),
              _buildSection(
                theme,
                'تغییرات در این سیاست',
                'ما ممکن است این سیاست را به‌روز کنیم. تغییرات مهم از طریق برنامه یا ایمیل به شما اطلاع‌رسانی می‌شود. توصیه می‌شود دوره‌ای این سیاست را مرور کنید.',
              ),
              _buildContactSection(theme),
              const SizedBox(height: AppSpacing.xxl),
              Text(
                'آخرین به‌روزرسانی: ژوئیه ۲۰۲۶',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContactSection(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'تماس با ما',
            style: theme.textTheme.titleMedium?.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'اگر سؤال یا نگرانی در مورد این سیاست دارید، لطفاً با ما تماس بگیرید:',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textPrimary,
              height: 1.8,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'ایمیل: support@golino.ir',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textPrimary,
              height: 1.8,
            ),
          ),
          Row(
            children: [
              Text(
                'تلفن: ',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.textPrimary,
                  height: 1.8,
                ),
              ),
              GestureDetector(
                onTap: () async {
                  final uri = Uri.parse('tel:+982133104678');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri);
                  }
                },
                child: Text(
                  '۰۲۱-۳۳۱۰۴۶۷۸',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.primary,
                    decoration: TextDecoration.underline,
                    decorationColor: AppColors.primary,
                    height: 1.8,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSection(ThemeData theme, String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            content,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textPrimary,
              height: 1.8,
            ),
          ),
        ],
      ),
    );
  }
}
