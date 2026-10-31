package com.subscriptiq.service;

import com.subscriptiq.model.*;
import com.subscriptiq.repo.*;
import com.subscriptiq.web.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;

@Service
public class SubscriptionService {
    private final SubscriptionRepository subs;
    private final CustomerRepository customers;
    private final PlanRepository plans;
    private final InvoiceRepository invoices;
    private final InvoiceService invoiceService;

    public Subscription get(Long id) {
        return subs.findById(id).orElseThrow(() -> new NotFoundException("Subscription not found"));
    }

    @Transactional
    public Subscription create(Dto.SubscriptionRequest r) {
        Subscription s = new Subscription();
        apply(s, r, true);
        s.setStatus(statusFor(s));
        s = subs.save(s);
        invoiceService.issue(s, LocalDate.now());
        return s;
    }

    @Transactional
    public Subscription update(Long id, Dto.SubscriptionRequest r) {
        Subscription s = get(id);
        if (s.getStatus() == SubStatus.CANCELLED) throw new ConflictException("Cancelled subscriptions cannot be edited");
        boolean planChanged = !s.getPlan().getId().equals(r.planId());
        apply(s, r, planChanged);
        s.setStatus(statusFor(s));
        return subs.save(s);
    }

    /** Extends the subscription by one billing cycle and issues the next invoice. */
    @Transactional
    public Subscription renew(Long id) {
        Subscription s = get(id);
        if (s.getStatus() == SubStatus.CANCELLED) throw new ConflictException("Cancelled subscriptions cannot be renewed");
        LocalDate today = LocalDate.now();
        LocalDate base = s.getEndDate().isBefore(today) ? today : s.getEndDate();
        s.setEndDate(s.getPlan().getBillingCycle().addTo(base));
        s.setStatus(SubStatus.ACTIVE);
        subs.save(s);
        invoiceService.issue(s, today);
        return s;
    }

    @Transactional
    public Subscription cancel(Long id) {
        Subscription s = get(id);
        s.setStatus(SubStatus.CANCELLED);
        s.setAutoRenew(false);
        return subs.save(s);
    }

    @Transactional
    public void delete(Long id) {
        Subscription s = get(id);
        invoices.deleteBySubscriptionId(id);
        subs.delete(s);
    }

    private void apply(Subscription s, Dto.SubscriptionRequest r, boolean requireActivePlan) {
        Customer c = customers.findById(r.customerId()).orElseThrow(() -> new NotFoundException("Customer not found"));
        Plan p = plans.findById(r.planId()).orElseThrow(() -> new NotFoundException("Plan not found"));
        if (requireActivePlan && !p.isActive()) throw new IllegalArgumentException("Selected plan is not active");
        LocalDate end = r.endDate() != null ? r.endDate() : p.getBillingCycle().addTo(r.startDate());
        if (end.isBefore(r.startDate())) throw new IllegalArgumentException("End date cannot be before start date");
        s.setCustomer(c);
        s.setPlan(p);
        s.setStartDate(r.startDate());
        s.setEndDate(end);
        s.setAutoRenew(r.autoRenew());
    }

    private SubStatus statusFor(Subscription s) {
        return s.getEndDate().isBefore(LocalDate.now()) ? SubStatus.EXPIRED : SubStatus.ACTIVE;
    }

    public SubscriptionService(SubscriptionRepository subs, CustomerRepository customers, PlanRepository plans, InvoiceRepository invoices, InvoiceService invoiceService) { this.subs = subs; this.customers = customers; this.plans = plans; this.invoices = invoices; this.invoiceService = invoiceService; }
}
