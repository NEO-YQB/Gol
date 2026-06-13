class VendorOrderDetail {
  const VendorOrderDetail({
    required this.id,
    required this.status,
    required this.paymentStatus,
    required this.customerName,
    required this.phoneNumber,
    required this.totalAmount,
    required this.createdAt,
    required this.availableActions,
  });

  final int id;
  final String status;
  final String paymentStatus;
  final String customerName;
  final String phoneNumber;
  final num totalAmount;
  final String createdAt;
  final Map<String, dynamic> availableActions;

  factory VendorOrderDetail.fromJson(Map<String, dynamic> json) {
    return VendorOrderDetail(
      id: _asInt(json['id']),
      status: _readText(json, const ['status'], fallback: 'UNKNOWN'),
      paymentStatus:
          _readText(json, const ['paymentStatus'], fallback: 'UNKNOWN'),
      customerName: _readText(json, const [
        'customerName',
        'customer',
        'recipientName',
        'userId',
      ], fallback: '—'),
      phoneNumber: _readText(
        json,
        const ['recipientPhoneNumber', 'phoneNumber'],
        fallback: '—',
      ),
      totalAmount: _asNum(
        json['totalAmount'] ?? json['payableAmount'] ?? json['finalAmount'],
      ),
      createdAt: _readText(json, const ['createdAt', 'updatedAt']),
      availableActions:
          (json['availableActions'] as Map<String, dynamic>?) ?? const {},
    );
  }
}

int _asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}

num _asNum(Object? value) {
  if (value is num) return value;
  return num.tryParse('$value') ?? 0;
}

String _readText(
  Map<String, dynamic> json,
  List<String> keys, {
  String fallback = '',
}) {
  for (final key in keys) {
    final value = json[key];
    if (value == null) continue;
    final text = value.toString().trim();
    if (text.isNotEmpty) return text;
  }
  return fallback;
}
