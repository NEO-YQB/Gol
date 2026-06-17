import 'package:flutter/material.dart';
import 'package:persian_datetime_picker/persian_datetime_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../domain/vendor_discount.dart';
import 'view_models/discount_workspace_view_model.dart';

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
  late final DiscountWorkspaceViewModel _viewModel;

  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _valueController;
  late final TextEditingController _priorityController;
  late final TextEditingController _startAtController;
  late final TextEditingController _endAtController;

  bool get _isEdit => _viewModel.isEdit;

  @override
  void initState() {
    super.initState();
    _viewModel = DiscountWorkspaceViewModel(
      accessToken: widget.accessToken,
      storeId: widget.storeId,
      discountId: widget.discountId,
    );
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
    _viewModel.dispose();
    _titleController.dispose();
    _descriptionController.dispose();
    _valueController.dispose();
    _priorityController.dispose();
    _startAtController.dispose();
    _endAtController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    await _viewModel.loadData();
    final discount = _viewModel.state.discount;
    if (discount != null && mounted) _fillForm(discount);
  }

  void _fillForm(VendorDiscount discount) {
    _titleController.text = discount.title;
    _descriptionController.text = discount.description;
    _valueController.text = discount.value.toString();
    _priorityController.text = discount.priority.toString();
    _syncDateControllers();
  }

  Future<void> _save() async {
    final changed = await _viewModel.save(
      title: _titleController.text,
      description: _descriptionController.text,
      value: _valueController.text,
      priority: _priorityController.text,
    );
    if (!changed || !mounted) return;
    Navigator.of(context).pop(true);
  }

  Future<void> _delete() async {
    final changed = await _viewModel.delete();
    if (!changed || !mounted) return;
    Navigator.of(context).pop(true);
  }

  Future<void> _pickStartAt() async {
    final picked = await _pickDateTime(
      initial: _viewModel.state.startAt,
      firstDateTime: DateTime.now(),
    );
    if (picked == null) return;

    _viewModel.setStartAt(picked);
    _syncDateControllers();
  }

  Future<void> _pickEndAt() async {
    final minBase = _viewModel.state.startAt ?? DateTime.now();
    final picked = await _pickDateTime(
      initial: _viewModel.state.endAt ?? minBase.add(const Duration(hours: 1)),
      firstDateTime: minBase,
    );
    if (picked == null) return;

    _viewModel.setEndAt(picked);
    _syncDateControllers();
  }

  Future<DateTime?> _pickDateTime({
    required DateTime? initial,
    required DateTime firstDateTime,
  }) async {
    final now = DateTime.now();
    final safeInitial = (initial != null && initial.isAfter(firstDateTime))
        ? initial
        : firstDateTime.isAfter(now)
            ? firstDateTime
            : now;

    final initialJalali = Jalali.fromDateTime(safeInitial);
    final firstJalali = Jalali.fromDateTime(firstDateTime);
    final todayJalali = Jalali.fromDateTime(now);
    final lastJalali = Jalali.fromDateTime(DateTime(now.year + 3, 12, 31));

    final date = await showPersianDatePicker(
      context: context,
      initialDate: initialJalali,
      firstDate: firstJalali,
      lastDate: lastJalali,
      currentDate: todayJalali,
      confirmText: 'تایید',
      cancelText: 'انصراف',
      locale: const Locale('fa', 'IR'),
      textDirection: TextDirection.rtl,
    );
    if (date == null || !mounted) return null;

    final gregorian = date.toGregorian();
    final pickedDate = DateTime(
      gregorian.year,
      gregorian.month,
      gregorian.day,
    );

    final earliestTime = pickedDate.year == firstDateTime.year &&
            pickedDate.month == firstDateTime.month &&
            pickedDate.day == firstDateTime.day
        ? TimeOfDay.fromDateTime(firstDateTime.add(const Duration(minutes: 1)))
        : const TimeOfDay(hour: 0, minute: 0);

    final time = await showTimePicker(
      context: context,
      initialTime: safeInitial.isAfter(firstDateTime)
          ? TimeOfDay.fromDateTime(safeInitial)
          : earliestTime,
    );
    if (time == null) return null;

    final picked = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      time.hour,
      time.minute,
    );

    if (picked.isBefore(firstDateTime) || picked.isAtSameMomentAs(firstDateTime)) {
      return firstDateTime.add(const Duration(minutes: 1));
    }

    return picked;
  }

  void _syncDateControllers() {
    _startAtController.text = _viewModel.state.startAtLabel;
    _endAtController.text = _viewModel.state.endAtLabel;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: ListenableBuilder(
              listenable: _viewModel,
              builder: (context, _) {
                final state = _viewModel.state;

                return state.isLoading
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
                      const SizedBox(height: AppSpacing.md),
                      AppGlassCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (state.errorMessage != null) ...[
                              Text(
                                state.errorMessage!,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: Theme.of(context).colorScheme.error,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.lg),
                            ],
                            DropdownButtonFormField<int>(
                              value: state.selectedProductId,
                              decoration: const InputDecoration(
                                labelText: 'محصول',
                              ),
                              items: state.products
                                  .map(
                                    (item) => DropdownMenuItem<int>(
                                      value: item.id,
                                      child: Text(item.name),
                                    ),
                                  )
                                  .toList(),
                              onChanged: _isEdit ? null : _viewModel.selectProduct,
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
                                    value: state.valueType,
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
                                      _viewModel.setValueType(value);
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
                              readOnly: true,
                              onTap: _pickStartAt,
                              decoration: const InputDecoration(
                                labelText: 'شروع',
                                suffixIcon: Icon(Icons.calendar_month_rounded),
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            TextField(
                              controller: _endAtController,
                              readOnly: true,
                              onTap: _pickEndAt,
                              decoration: const InputDecoration(
                                labelText: 'پایان',
                                suffixIcon: Icon(Icons.event_available_rounded),
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            SwitchListTile(
                              value: state.isActive,
                              onChanged: _viewModel.setIsActive,
                              title: const Text('تخفیف فعال باشد'),
                              contentPadding: EdgeInsets.zero,
                            ),
                            SwitchListTile(
                              value: state.isExclusive,
                              onChanged: _viewModel.setIsExclusive,
                              title: const Text('انحصاری باشد'),
                              contentPadding: EdgeInsets.zero,
                            ),
                            SwitchListTile(
                              value: state.allowCouponStacking,
                              onChanged: _viewModel.setAllowCouponStacking,
                              title: const Text('هم‌زمان با کوپن اجازه داشته باشد'),
                              contentPadding: EdgeInsets.zero,
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton(
                                onPressed: state.isSaving ? null : _save,
                                child: Text(
                                  state.isSaving ? 'در حال ذخیره...' : 'ذخیره تخفیف',
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
                  );
              },
            ),
          ),
        ),
      ),
    );
  }
}
