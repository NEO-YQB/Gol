class VendorOrderSummary {
  const VendorOrderSummary({
    required this.id,
    required this.customerName,
    required this.status,
    required this.paymentStatus,
    required this.totalAmount,
    required this.createdAt,
    required this.phoneNumber,
  });

  final int id;
  final String customerName;
  final String status;
  final String paymentStatus;
  final num totalAmount;
  final String createdAt;
  final String phoneNumber;

  factory VendorOrderSummary.fromJson(Map<String, dynamic> json) {
    return VendorOrderSummary(
      id: _asInt(json['id']),
      customerName: _readText(json, const [
        'customerName',
        'customer',
        'recipientName',
        'userId',
      ]),
      status: _readText(json, const ['status'], fallback: 'UNKNOWN'),
      paymentStatus:
          _readText(json, const ['paymentStatus'], fallback: 'UNKNOWN'),
      totalAmount: _asNum(
        json['totalAmount'] ?? json['payableAmount'] ?? json['finalAmount'],
      ),
      createdAt: _readText(
        json,
        const ['createdAt', 'updatedAt'],
      ),
      phoneNumber: _readText(
        json,
        const ['recipientPhoneNumber', 'phoneNumber'],
      ),
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
