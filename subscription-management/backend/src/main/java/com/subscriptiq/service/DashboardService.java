package com.subscriptiq.service;

import com.subscriptiq.model.*;
import com.subscriptiq.repo.*;
import com.subscriptiq.web.Dto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {
    public static final int EXPIRY_WARNING_DAYS = 7;

    private final SubscriptionRepository subs;
    private final InvoiceRepository invoices;
    private final CustomerRepository customers;
    private final MaintenanceService maintenance;

    @Transactional
    public Dashboard dashboard() {
        maintenance.refreshStatuses();
        List<Subscription> active = subs.findByStatus(SubStatus.ACTIVE);
        List<Invoice> overdue = invoices.findByStatus(InvoiceStatus.OVERDUE);
        Map<String, Long> counts = new LinkedHashMap<>();
        for (SubStatus st : SubStatus.values()) counts.put(st.name(), subs.countByStatus(st));
        return new Dashboard(subs.count(), active.size(), mrr(active), overdue.size(), sumInvoices(overdue),
                customers.count(), expiring().size(), counts, revenueByMonth(6), planStats(active));
    }

    @Transactional
    public Alerts alerts() {
        maintenance.refreshStatuses();
        return new Alerts(expiring(), invoices.findByStatusOrderByDueDate(InvoiceStatus.OVERDUE));
    }

    @Transactional
    public Report report() {
        maintenance.refreshStatuses();
        List<Invoice> paid = invoices.findByStatus(InvoiceStatus.PAID);
        Map<String, BigDecimal> byCustomer = new HashMap<>();
        paid.forEach(i -> byCustomer.merge(i.getSubscription().getCustomer().getName(), i.getAmount(), BigDecimal::add));
        List<CustomerStat> top = byCustomer.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed()).limit(5)
                .map(e -> new CustomerStat(e.getKey(), e.getValue())).toList();
        return new Report(revenueByMonth(12), planStats(subs.findByStatus(SubStatus.ACTIVE)), top,
                sumInvoices(paid), sumInvoices(invoices.findByStatus(InvoiceStatus.PENDING)),
                sumInvoices(invoices.findByStatus(InvoiceStatus.OVERDUE)));
    }

    private List<Subscription> expiring() {
        LocalDate today = LocalDate.now();
        return subs.findByStatusAndEndDateBetweenOrderByEndDate(SubStatus.ACTIVE, today, today.plusDays(EXPIRY_WARNING_DAYS));
    }

    private BigDecimal monthly(Subscription s) {
        return s.getPlan().getBillingCycle().monthlyEquivalent(s.getPlan().getPrice());
    }

    private BigDecimal mrr(List<Subscription> active) {
        return active.stream().map(this::monthly).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumInvoices(List<Invoice> list) {
        return list.stream().map(Invoice::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<MonthRevenue> revenueByMonth(int months) {
        Map<YearMonth, BigDecimal> sums = new HashMap<>();
        for (Invoice i : invoices.findByStatus(InvoiceStatus.PAID)) {
            LocalDate d = i.getPaidDate() != null ? i.getPaidDate() : i.getIssueDate();
            sums.merge(YearMonth.from(d), i.getAmount(), BigDecimal::add);
        }
        YearMonth now = YearMonth.now();
        List<MonthRevenue> out = new ArrayList<>();
        for (int k = months - 1; k >= 0; k--) {
            YearMonth ym = now.minusMonths(k);
            out.add(new MonthRevenue(ym.toString(), sums.getOrDefault(ym, BigDecimal.ZERO)));
        }
        return out;
    }

    private List<PlanStat> planStats(List<Subscription> active) {
        return active.stream().collect(Collectors.groupingBy(s -> s.getPlan().getName())).entrySet().stream()
                .map(e -> new PlanStat(e.getKey(), e.getValue().size(), mrr(e.getValue())))
                .sorted(Comparator.comparing(PlanStat::mrr).reversed()).toList();
    }

    public DashboardService(SubscriptionRepository subs, InvoiceRepository invoices, CustomerRepository customers, MaintenanceService maintenance) { this.subs = subs; this.invoices = invoices; this.customers = customers; this.maintenance = maintenance; }
}
