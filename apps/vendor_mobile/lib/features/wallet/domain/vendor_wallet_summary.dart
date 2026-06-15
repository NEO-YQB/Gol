class VendorWalletSummary {
  const VendorWalletSummary({
    required this.period,
    required this.fromDateJalali,
    required this.toDateJalali,
    required this.currentBalance,
    required this.availableBalance,
    required this.heldBalance,
    required this.transactionCount,
    required this.creditAmount,
    required this.debitAmount,
    required this.recentTransactions,
    required this.pendingSettlementsCount,
    required this.eligibleSettlementsCount,
    required this.processingSettlementsCount,
    required this.settledSettlementsCount,
    required this.onHoldSettlementsCount,
    required this.reversedSettlementsCount,
    required this.vendorShareTotal,
    required this.releasedTotal,
    required this.reversedTotal,
    required this.releasableEstimate,
    required this.recentSettlements,
  });

  final String period;
  final String fromDateJalali;
  final String toDateJalali;
  final num currentBalance;
  final num availableBalance;
  final num heldBalance;
  final int transactionCount;
  final num creditAmount;
  final num debitAmount;
  final List<VendorWalletTransaction> recentTransactions;
  final int pendingSettlementsCount;
  final int eligibleSettlementsCount;
  final int processingSettlementsCount;
  final int settledSettlementsCount;
  final int onHoldSettlementsCount;
  final int reversedSettlementsCount;
  final num vendorShareTotal;
  final num releasedTotal;
  final num reversedTotal;
  final num releasableEstimate;
  final List<VendorSettlementOrder> recentSettlements;
}

class VendorWalletTransaction {
  const VendorWalletTransaction({
    required this.id,
    required this.type,
    required this.direction,
    required this.amount,
    required this.title,
    required this.description,
    required this.orderId,
    required this.createdAt,
  });

  final int id;
  final String type;
  final String direction;
  final num amount;
  final String title;
  final String? description;
  final int? orderId;
  final DateTime? createdAt;
}

class VendorSettlementOrder {
  const VendorSettlementOrder({
    required this.id,
    required this.settlementStatus,
    required this.vendorShareAmount,
    required this.settlementReleasedAmount,
    required this.settlementReversedAmount,
    required this.settlementEligibleAt,
    required this.updatedAt,
  });

  final int id;
  final String settlementStatus;
  final num vendorShareAmount;
  final num settlementReleasedAmount;
  final num settlementReversedAmount;
  final DateTime? settlementEligibleAt;
  final DateTime? updatedAt;
}
