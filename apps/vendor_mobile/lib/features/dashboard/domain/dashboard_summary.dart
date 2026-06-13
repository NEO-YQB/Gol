class DashboardSummary {
  const DashboardSummary({
    required this.storeName,
    required this.availableBalance,
    required this.heldBalance,
    required this.processingSettlementsCount,
    required this.onHoldSettlementsCount,
    required this.openTicketsCount,
    required this.escalatedTicketsCount,
    required this.healthScore,
    required this.healthStatus,
    required this.policyNote,
    required this.policyTimeline,
  });

  final String storeName;
  final num availableBalance;
  final num heldBalance;
  final int processingSettlementsCount;
  final int onHoldSettlementsCount;
  final int openTicketsCount;
  final int escalatedTicketsCount;
  final num healthScore;
  final String healthStatus;
  final String policyNote;
  final List<DashboardPolicyEvent> policyTimeline;
}

class DashboardPolicyEvent {
  const DashboardPolicyEvent({
    required this.id,
    required this.aggregateType,
    required this.summary,
    required this.createdAt,
  });

  final int id;
  final String aggregateType;
  final String summary;
  final DateTime? createdAt;
}
