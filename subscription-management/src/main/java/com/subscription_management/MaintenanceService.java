package com.subscriptiq.service;

import com.subscriptiq.model.*;
import com.subscriptiq.repo.*;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;

@Service
public class MaintenanceService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MaintenanceService.class);

    private final SubscriptionRepository subs;
    private final InvoiceRepository invoices;
    private final SubscriptionService subscriptionService;

    /** Cheap, idempotent: flags overdue invoices and expires lapsed non-auto-renew subscriptions. */
    @Transactional
    public void refreshStatuses() {
        LocalDate today = LocalDate.now();
        subs.expireDue(SubStatus.EXPIRED, SubStatus.ACTIVE, today);
        invoices.markOverdue(InvoiceStatus.OVERDUE, InvoiceStatus.PENDING, today);
    }

    /** Runs at startup and nightly: renews auto-renew subscriptions that have reached their end date. */
    @Scheduled(cron = "0 0 2 * * *")
    @EventListener(ApplicationReadyEvent.class)
    public void dailyJob() {
        for (Subscription s : subs.findByStatusAndAutoRenewTrueAndEndDateBefore(SubStatus.ACTIVE, LocalDate.now())) {
            try {
                subscriptionService.renew(s.getId());
            } catch (Exception e) {
                log.warn("Auto-renew failed for subscription {}: {}", s.getId(), e.getMessage());
            }
        }
        refreshStatuses();
    }

    public MaintenanceService(SubscriptionRepository subs, InvoiceRepository invoices, SubscriptionService subscriptionService) { this.subs = subs; this.invoices = invoices; this.subscriptionService = subscriptionService; }
}
