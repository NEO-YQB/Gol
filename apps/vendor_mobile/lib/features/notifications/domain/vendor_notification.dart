class VendorNotification {
  const VendorNotification({
    required this.id,
    required this.topic,
    required this.title,
    required this.body,
    required this.status,
    required this.channel,
    required this.createdAt,
    required this.orderId,
    required this.supportTicketId,
    required this.deliveries,
  });

  final int id;
  final String topic;
  final String title;
  final String body;
  final String status;
  final String channel;
  final DateTime? createdAt;
  final int? orderId;
  final int? supportTicketId;
  final List<VendorNotificationDelivery> deliveries;
}

class VendorNotificationDelivery {
  const VendorNotificationDelivery({
    required this.id,
    required this.channel,
    required this.status,
    required this.attempts,
    required this.sentAt,
  });

  final int id;
  final String channel;
  final String status;
  final int attempts;
  final DateTime? sentAt;
}
