import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../data/products_api_service.dart';

class CompositionElementPickerSheet extends StatefulWidget {
  const CompositionElementPickerSheet({
    super.key,
    required this.elements,
    this.selectedElementId,
    this.initialType,
  });

  final List<ProductElementOption> elements;
  final int? selectedElementId;
  final String? initialType;

  static Future<ProductElementOption?> show(
    BuildContext context, {
    required List<ProductElementOption> elements,
    int? selectedElementId,
    String? initialType,
  }) {
    return showModalBottomSheet<ProductElementOption>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CompositionElementPickerSheet(
        elements: elements,
        selectedElementId: selectedElementId,
        initialType: initialType,
      ),
    );
  }

  @override
  State<CompositionElementPickerSheet> createState() =>
      _CompositionElementPickerSheetState();
}

class _CompositionElementPickerSheetState
    extends State<CompositionElementPickerSheet> {
  final TextEditingController _searchController = TextEditingController();
  late String _selectedType;
  String _searchQuery = '';

  static const Map<String, String> _typeLabels = {
    '': 'همه',
    'FLOWER': '🌸 گل‌ها',
    'FILLER': '🌿 پرکننده‌ها',
    'ACCESSORY': '🎀 اکسسوری',
    'BASE': '🏺 بیس و گلدان',
  };

  @override
  void initState() {
    super.initState();
    _selectedType = widget.initialType?.toUpperCase().trim() ?? '';
    if (!_typeLabels.containsKey(_selectedType)) {
      _selectedType = '';
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<ProductElementOption> get _filteredElements {
    return widget.elements.where((element) {
      // Filter by type
      if (_selectedType.isNotEmpty &&
          element.type.toUpperCase() != _selectedType) {
        return false;
      }
      // Filter by search query
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final nameMatches = element.name.toLowerCase().contains(q);
        final unitMatches = element.unit.toLowerCase().contains(q);
        return nameMatches || unitMatches;
      }
      return true;
    }).toList();
  }

  String _formatTypeBadge(String type) {
    switch (type.toUpperCase()) {
      case 'FLOWER':
        return 'گل';
      case 'FILLER':
        return 'پرکننده';
      case 'ACCESSORY':
        return 'اکسسوری';
      case 'BASE':
        return 'بیس';
      default:
        return type;
    }
  }

  Color _badgeColor(String type) {
    switch (type.toUpperCase()) {
      case 'FLOWER':
        return const Color(0xFFE57373);
      case 'FILLER':
        return const Color(0xFF81C784);
      case 'ACCESSORY':
        return const Color(0xFFFFB74D);
      case 'BASE':
        return const Color(0xFF64B5F6);
      default:
        return AppColors.secondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final filtered = _filteredElements;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      margin: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: Color(0xFF142B21),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag Handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                const Icon(
                  Icons.eco_rounded,
                  color: AppColors.secondary,
                  size: 24,
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'انتخاب المان تشکیل‌دهنده',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded, color: Colors.white70),
                ),
              ],
            ),
          ),

          // Search Field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: TextField(
              controller: _searchController,
              onChanged: (val) => setState(() => _searchQuery = val.trim()),
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'جستجوی زنده گل، پرکننده، اکسسوری...',
                hintStyle: const TextStyle(color: Colors.white54, fontSize: 13),
                prefixIcon: const Icon(Icons.search_rounded, color: Colors.white60),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, color: Colors.white60),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.08),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.15)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.15)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppColors.secondary),
                ),
              ),
            ),
          ),

          // Step 1: Category Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: _typeLabels.entries.map((entry) {
                final isSelected = _selectedType == entry.key;
                return Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: ChoiceChip(
                    label: Text(entry.value),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() {
                        _selectedType = selected ? entry.key : '';
                      });
                    },
                    selectedColor: AppColors.primary,
                    backgroundColor: Colors.white.withValues(alpha: 0.07),
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : Colors.white70,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                      fontSize: 12,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(
                        color: isSelected
                            ? AppColors.secondary
                            : Colors.white.withValues(alpha: 0.12),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          const Divider(color: Colors.white12, height: 1),

          // Element List
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.search_off_rounded,
                            size: 48,
                            color: Colors.white.withValues(alpha: 0.4),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'موردی یافت نشد.',
                            style: TextStyle(
                              color: Colors.white70,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _searchQuery.isNotEmpty
                                ? 'با عبارت «$_searchQuery» عنصری وجود ندارد.'
                                : 'در این دسته‌بندی هنوز المانی ثبت نشده است.',
                            style: const TextStyle(
                              color: Colors.white54,
                              fontSize: 12,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) =>
                        const Divider(color: Colors.white10, height: 1),
                    itemBuilder: (context, index) {
                      final element = filtered[index];
                      final isSelected = widget.selectedElementId == element.id;

                      return ListTile(
                        onTap: () => Navigator.of(context).pop(element),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        tileColor: isSelected
                            ? Colors.white.withValues(alpha: 0.10)
                            : Colors.transparent,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 4,
                        ),
                        leading: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: _badgeColor(element.type).withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: _badgeColor(element.type).withValues(alpha: 0.4),
                            ),
                          ),
                          child: Text(
                            _formatTypeBadge(element.type),
                            style: TextStyle(
                              color: _badgeColor(element.type),
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        title: Text(
                          element.name,
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: isSelected
                                ? FontWeight.w800
                                : FontWeight.w600,
                          ),
                        ),
                        subtitle: element.unit.isNotEmpty
                            ? Text(
                                'واحد: ${element.unit}',
                                style: const TextStyle(
                                  color: Colors.white54,
                                  fontSize: 12,
                                ),
                              )
                            : null,
                        trailing: isSelected
                            ? const Icon(
                                Icons.check_circle_rounded,
                                color: AppColors.secondary,
                                size: 22,
                              )
                            : const Icon(
                                Icons.chevron_left_rounded,
                                color: Colors.white30,
                              ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
