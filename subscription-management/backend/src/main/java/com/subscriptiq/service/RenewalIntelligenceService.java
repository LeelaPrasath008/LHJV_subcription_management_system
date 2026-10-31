package com.subscriptiq.service;

import com.subscriptiq.model.*;
import com.subscriptiq.repo.InvoiceRepository;
import com.subscriptiq.repo.SubscriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class RenewalIntelligenceService {
    private final SubscriptionRepository subscriptions;
    private final InvoiceRepository invoices;

    public RenewalIntelligenceService(SubscriptionRepository subscriptions, InvoiceRepository invoices) {
        this.subscriptions = subscriptions;
        this.invoices = invoices;
    }

    /**
     * Explainable heuristic, not a trained/validated ML prediction.
     * Scores each subscription from 0 (low observed risk) to 100 (high observed risk).
     */
    @Transactional(readOnly = true)
    public List<RiskItem> getRiskItems() {
        LocalDate today = LocalDate.now();
        List<Invoice> allInvoices = invoices.findAll();
        List<RiskItem> results = new ArrayList<>();

        for (Subscription s : subscriptions.findAll()) {
            int score = 0;
            List<String> reasons = new ArrayList<>();
            List<String> actions = new ArrayList<>();
            boolean overdue = allInvoices.stream().anyMatch(i ->
                    i.getSubscription().getId().equals(s.getId()) && i.getStatus() == InvoiceStatus.OVERDUE);
            long daysToEnd = ChronoUnit.DAYS.between(today, s.getEndDate());

            if (overdue) {
                score += 45;
                reasons.add("Has an overdue invoice");
                actions.add("Contact the customer about the outstanding balance");
            }
            if (s.getStatus() == SubStatus.CANCELLED) {
                score += 60;
                reasons.add("Subscription is cancelled");
                actions.add("Ask for cancellation feedback and offer a suitable plan");
            } else if (s.getStatus() == SubStatus.EXPIRED) {
                score += 35;
                reasons.add("Subscription has expired");
                actions.add("Send a win-back offer");
            } else if (daysToEnd >= 0 && daysToEnd <= 7 && !s.isAutoRenew()) {
                score += 30;
                reasons.add("Ends within 7 days and auto-renew is off");
                actions.add("Send a renewal reminder before the end date");
            }
            if (s.getStatus() == SubStatus.ACTIVE && !s.isAutoRenew()) {
                score += 10;
                reasons.add("Auto-renew is disabled");
                actions.add("Ask whether the customer wants automatic renewal");
            }
            score = Math.min(score, 100);
            String band = score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";
            results.add(new RiskItem(s.getId(), s.getCustomer().getName(), s.getCustomer().getEmail(),
                    s.getPlan().getName(), s.getStatus().name(), s.getEndDate().toString(),
                    s.isAutoRenew(), score, band, List.copyOf(reasons), List.copyOf(actions)));
        }

        return results.stream()
                .sorted(Comparator.comparingInt(RiskItem::score).reversed()
                        .thenComparing(RiskItem::endDate))
                .toList();
    }

    public record RiskItem(Long subscriptionId, String customer, String email, String plan,
                           String status, String endDate, boolean autoRenew, int score, String risk,
                           List<String> reasons, List<String> recommendedActions) {}
}