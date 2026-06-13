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
}
