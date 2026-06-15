class VendorSupportTicket {
  const VendorSupportTicket({
    required this.id,
    required this.orderId,
    required this.status,
    required this.reason,
    required this.title,
    required this.customerName,
    required this.customerPhone,
    required this.createdAt,
    required this.resolvedAt,
    required this.latestOperationalFlags,
  });

  final int id;
  final int? orderId;
  final String status;
  final String reason;
  final String title;
  final String customerName;
  final String customerPhone;
  final DateTime? createdAt;
  final DateTime? resolvedAt;
  final List<String> latestOperationalFlags;
}

class VendorSupportTicketDetail {
  const VendorSupportTicketDetail({
    required this.id,
    required this.orderId,
    required this.status,
    required this.reason,
    required this.title,
    required this.description,
    required this.customerName,
    required this.customerPhone,
    required this.storeName,
    required this.createdAt,
    required this.resolvedAt,
    required this.timeline,
    required this.latestOperationalFlags,
  });

  final int id;
  final int? orderId;
  final String status;
  final String reason;
  final String title;
  final String description;
  final String customerName;
  final String customerPhone;
  final String storeName;
  final DateTime? createdAt;
  final DateTime? resolvedAt;
  final List<VendorSupportTicketMessage> timeline;
  final List<String> latestOperationalFlags;
}

class VendorSupportTicketMessage {
  const VendorSupportTicketMessage({
    required this.id,
    required this.actorType,
    required this.message,
    required this.createdAt,
    required this.isInternal,
  });

  final int id;
  final String actorType;
  final String message;
  final DateTime? createdAt;
  final bool isInternal;
}
