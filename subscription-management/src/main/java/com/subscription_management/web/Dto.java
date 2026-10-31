package com.subscriptiq.web;

import com.subscriptiq.model.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Request / response payloads. */
public final class Dto {
    private Dto() {}

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}
    public record LoginResponse(String token, String username, String fullName, String role) {}
    public record SubscriptionRequest(@NotNull Long customerId, @NotNull Long planId, @NotNull LocalDate startDate,
                                      LocalDate endDate, boolean autoRenew) {}
    public record PaymentRequest(@NotBlank @Size(max = 40) String method, @Size(max = 100) String reference) {}

    public record MonthRevenue(String month, BigDecimal revenue) {}
    public record PlanStat(String plan, long subscriptions, BigDecimal mrr) {}
    public record CustomerStat(String customer, BigDecimal paid) {}
    public record Dashboard(long totalSubscriptions, long activeSubscriptions, BigDecimal mrr, long overdueCount,
                            BigDecimal overdueAmount, long totalCustomers, long expiringSoon,
                            Map<String, Long> statusCounts, List<MonthRevenue> revenueByMonth, List<PlanStat> planStats) {}
    public record Alerts(List<Subscription> expiring, List<Invoice> overdue) {}
    public record Report(List<MonthRevenue> revenueByMonth, List<PlanStat> planStats, List<CustomerStat> topCustomers,
                         BigDecimal paidTotal, BigDecimal pendingTotal, BigDecimal overdueTotal) {}
    public record ApiError(int status, String message, Map<String, String> fieldErrors) {}
}
