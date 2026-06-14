import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../../auth/data/auth_api_service.dart';
import '../../products/domain/vendor_product_summary.dart';
import '../data/vendor_discounts_api_service.dart';
import '../domain/vendor_discount.dart';

class DiscountWorkspaceScreen extends StatefulWidget {
  const DiscountWorkspaceScreen({
    super.key,
    required this.accessToken,
    required this.storeId,
    this.discountId,
  });

  final String accessToken;
  final int storeId;
  final int? discountId;

  @override
  State<DiscountWorkspaceScreen> createState() => _DiscountWorkspaceScreenState();
}

class _DiscountWorkspaceScreenState extends State<DiscountWorkspaceScreen> {
  final _apiService = const VendorDiscountsApiService();

  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _valueController;
  late final TextEditingController _priorityController;
  late final TextEditingController _startAtController;
  late final TextEditingController _endAtController;

  bool _isLoading = true;
  bool _isSaving = false;
  String? _errorMessage;
  List<VendorProductSummary> _products = const [];
  VendorDiscount? _discount;
  int? _selectedProductId;
  String _valueType = 'PERCENTAGE';
  bool _isActive = true;
  bool _isExclusive = false;
  bool _allowCouponStacking = false;

  bool get _isEdit => widget.discountId != null;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    _descriptionController = TextEditingController();
    _valueController = TextEditingController();
    _priorityController = TextEditingController(text: '100');
    _startAtController = TextEditingController();
    _endAtController = TextEditingController();
    _loadData();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _valueController.dispose();
    _priorityController.dispose();
    _startAtController.dispose();
    _endAtController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final productsFuture = _apiService.getStoreProducts(
        accessToken: widget.accessToken,
        storeId: widget.storeId,
      );
      final discountFuture = _isEdit
          ? _apiService.getDiscountDetail(
              accessToken: widget.accessToken,
              discountId: widget.discountId!,
            )
          : Future.value(null);

      final products = await productsFuture;
      final discount = await discountFuture;

      if (!mounted) return;
      setState(() {
        _products = products;
        _discount = discount;
        if (discount != null) {
          _fillForm(discount);
        } else if (products.isNotEmpty) {
          _selectedProductId = products.first.id;
        }
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _fillForm(VendorDiscount discount) {
    _titleController.text = discount.title;
    _descriptionController.text = discount.description;
    _valueController.text = discount.value.toString();
    _priorityController.text = discount.priority.toString();
    _startAtController.text = discount.startAt;
    _endAtController.text = discount.endAt;
    _selectedProductId = discount.productId;
    _valueType = discount.valueType;
    _isActive = discount.isActive;
    _isExclusive = discount.isExclusive;
    _allowCouponStacking = discount.allowCouponStacking;
  }

  Future<void> _save() async {
    if (_titleController.text.trim().isEmpty ||
        _valueController.text.trim().isEmpty ||
        _selectedProductId == null) {
      setState(() {
        _errorMessage = 'عنوان، مقدار و محصول الزامی هستند.';
      });
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    final input = {
      'productId': _selectedProductId,
      'title': _titleController.text.trim(),
      'description': _emptyToNull(_descriptionController.text),
      'valueType': _valueType,
      'value': _parseNum(_valueController.text) ?? 0,
      'priority': _parseInt(_priorityController.text) ?? 100,
      'isActive': _isActive,
      'isExclusive': _isExclusive,
      'allowCouponStacking': _allowCouponStacking,
      'startAt': _emptyToNull(_startAtController.text),
      'endAt': _emptyToNull(_endAtController.text),
    };

    try {
      if (_isEdit) {
        await _apiService.updateDiscount(
          accessToken: widget.accessToken,
          discountId: widget.discountId!,
          input: input,
        );
      } else {
        await _apiService.createDiscount(
          accessToken: widget.accessToken,
          input: input,
        );
      }

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
      });
    }
  }

  Future<void> _delete() async {
    if (!_isEdit) return;

    try {
      await _apiService.deleteDiscount(
        accessToken: widget.accessToken,
        discountId: widget.discountId!,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
                    children: [
                      Row(
                        children: [
                          IconButton(
                            onPressed: () => Navigator.of(context).pop(),
                            icon: const Icon(Icons.arrow_back_rounded),
                          ),
                          Expanded(
                            child: Text(
                              _isEdit ? 'جزئیات تخفیف' : 'افزودن تخفیف',
                              style: theme.textTheme.titleMedium,
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(width: 48),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      AppGlassCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'تخفیف را تمیز و مستقیم روی یک محصول اعمال کن.',
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                            if (_errorMessage != null) ...[
                              const SizedBox(height: AppSpacing.md),
                              Text(
                                _errorMessage!,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: Theme.of(context).colorScheme.error,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                            const SizedBox(height: AppSpacing.lg),
                            DropdownButtonFormField<int>(
                              value: _selectedProductId,
                              decoration: const InputDecoration(
                                labelText: 'محصول',
                              ),
                              items: _products
                                  .map(
                                    (item) => DropdownMenuItem<int>(
                                      value: item.id,
                                      child: Text(item.name),
                                    ),
                                  )
                                  .toList(),
                              onChanged: _isEdit
                                  ? null
                                  : (value) {
                                      setState(() {
                                        _selectedProductId = value;
                                      });
                                    },
                            ),
                            const SizedBox(height: AppSpacing.md),
                            TextField(
                              controller: _titleController,
                              decoration: const InputDecoration(
                                labelText: 'عنوان تخفیف',
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            TextField(
                              controller: _descriptionController,
                              maxLines: 3,
                              decoration: const InputDecoration(
                                labelText: 'توضیحات',
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            Row(
                              children: [
                                Expanded(
                                  child: DropdownButtonFormField<String>(
                                    value: _valueType,
                                    decoration: const InputDecoration(
                                      labelText: 'نوع تخفیف',
                                    ),
                                    items: const [
                                      DropdownMenuItem(
                                        value: 'PERCENTAGE',
                                        child: Text('درصدی'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'FIXED_AMOUNT',
                                        child: Text('مبلغ ثابت'),
                                      ),
                                    ],
                                    onChanged: (value) {
                                      if (value == null) return;
                                      setState(() {
                                        _valueType = value;
                                      });
                                    },
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.md),
                                Expanded(
                                  child: TextField(
                                    controller: _valueController,
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(
                                      labelText: 'مقدار',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.md),
                            TextField(
                              controller: _priorityController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'اولویت',
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            TextField(
                              controller: _startAtController,
                              decoration: const InputDecoration(
                                labelText: 'شروع (ISO اختیاری)',
                                hintText: '2026-06-14T00:00:00.000Z',
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            TextField(
                              controller: _endAtController,
                              decoration: const InputDecoration(
                                labelText: 'پایان (ISO اختیاری)',
                                hintText: '2026-06-20T23:59:59.000Z',
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            SwitchListTile(
                              value: _isActive,
                              onChanged: (value) {
                                setState(() {
                                  _isActive = value;
                                });
                              },
                              title: const Text('تخفیف فعال باشد'),
                              contentPadding: EdgeInsets.zero,
                            ),
                            SwitchListTile(
                              value: _isExclusive,
                              onChanged: (value) {
                                setState(() {
                                  _isExclusive = value;
                                });
                              },
                              title: const Text('انحصاری باشد'),
                              contentPadding: EdgeInsets.zero,
                            ),
                            SwitchListTile(
                              value: _allowCouponStacking,
                              onChanged: (value) {
                                setState(() {
                                  _allowCouponStacking = value;
                                });
                              },
                              title: const Text('هم‌زمان با کوپن اجازه داشته باشد'),
                              contentPadding: EdgeInsets.zero,
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton(
                                onPressed: _isSaving ? null : _save,
                                child: Text(
                                  _isSaving ? 'در حال ذخیره...' : 'ذخیره تخفیف',
                                ),
                              ),
                            ),
                            if (_isEdit) ...[
                              const SizedBox(height: AppSpacing.sm),
                              SizedBox(
                                width: double.infinity,
                                child: TextButton.icon(
                                  onPressed: _delete,
                                  icon: const Icon(Icons.delete_outline_rounded),
                                  label: const Text('حذف تخفیف'),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

int? _parseInt(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return null;
  return int.tryParse(trimmed);
}

num? _parseNum(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return null;
  return num.tryParse(trimmed);
}

String? _emptyToNull(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}
