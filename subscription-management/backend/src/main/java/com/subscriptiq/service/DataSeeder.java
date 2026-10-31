package com.subscriptiq.service;

import com.subscriptiq.model.*;
import com.subscriptiq.repo.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Creates demo users, plans, customers, subscriptions and invoices on an empty database. */
@Component
public class DataSeeder implements CommandLineRunner {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository users;
    private final PlanRepository plans;
    private final CustomerRepository customers;
    private final SubscriptionRepository subs;
    private final InvoiceRepository invoices;
    private final InvoiceService invoiceService;
    private final PasswordEncoder encoder;
    @Value("${app.seed-demo-data}") private boolean seed;
    @Value("${app.admin-password}") private String adminPassword;
    @Value("${app.staff-password}") private String staffPassword;

    @Override
    public void run(String... args) {
        if (!seed || users.count() > 0) return;
        users.save(user("admin", "Alex Admin", adminPassword, Role.ADMIN));
        users.save(user("staff", "Sam Staff", staffPassword, Role.STAFF));

        List<Plan> ps = List.of(
                plan("Starter", "For individuals getting started", "19.00", BillingCycle.MONTHLY, "1 user\n5 projects\nEmail support"),
                plan("Growth", "For growing teams", "49.00", BillingCycle.MONTHLY, "10 users\nUnlimited projects\nPriority email support\nBasic analytics"),
                plan("Business", "Annual plan for companies", "499.00", BillingCycle.YEARLY, "50 users\nAdvanced analytics\nSSO\nPhone support"),
                plan("Team Quarterly", "Quarterly billing for teams", "129.00", BillingCycle.QUARTERLY, "20 users\nUnlimited projects\nPriority support"));
        ps = plans.saveAll(ps);

        String[][] cs = {
                {"Aarav Sharma", "aarav@brightlabs.io", "+91 98400 11111", "BrightLabs"},
                {"Meera Iyer", "meera@cloudnine.in", "+91 98400 22222", "CloudNine"},
                {"Rohan Das", "rohan@pixelcraft.co", "+91 98400 33333", "PixelCraft"},
                {"Priya Nair", "priya@greenleaf.org", "+91 98400 44444", "GreenLeaf"},
                {"Karthik Raman", "karthik@datahive.ai", "+91 98400 55555", "DataHive"},
                {"Ananya Rao", "ananya@finwise.com", "+91 98400 66666", "FinWise"},
                {"Vikram Singh", "vikram@shipfast.io", "+91 98400 77777", "ShipFast"},
                {"Divya Menon", "divya@learnloop.edu", "+91 98400 88888", "LearnLoop"},
                {"Arjun Patel", "arjun@medipulse.health", "+91 98400 99999", "MediPulse"},
                {"Sneha Kapoor", "sneha@urbannest.in", "+91 98400 10101", "UrbanNest"},
                {"Rahul Verma", "rahul@codeforge.dev", "+91 98400 20202", "CodeForge"},
                {"Lakshmi Pillai", "lakshmi@spicebox.shop", "+91 98400 30303", "SpiceBox"}};

        LocalDate today = LocalDate.now();
        for (int i = 0; i < cs.length; i++) {
            Customer c = new Customer();
            c.setName(cs[i][0]); c.setEmail(cs[i][1]); c.setPhone(cs[i][2]); c.setCompany(cs[i][3]);
            c = customers.save(c);

            Plan p = ps.get(i % ps.size());
            LocalDate start = today.minusMonths(i % 5).minusDays(i * 3L);
            if (i == 4) start = today.minusMonths(p.getBillingCycle().getMonths()).plusDays(4); // ends inside the 7-day warning window
            Subscription s = new Subscription();
            s.setCustomer(c); s.setPlan(p); s.setStartDate(start);
            s.setEndDate(p.getBillingCycle().addTo(start));
            boolean expired = s.getEndDate().isBefore(today);
            s.setStatus(i == 7 ? SubStatus.CANCELLED : expired ? SubStatus.EXPIRED : SubStatus.ACTIVE);
            s.setAutoRenew(!expired && i % 3 != 0 && i != 7);
            s = subs.save(s);

            // earlier billing periods, already paid
            for (int k = 1; k <= i % 4; k++) {
                LocalDate issued = start.minusMonths((long) k * p.getBillingCycle().getMonths());
                Invoice old = invoiceService.issue(s, issued);
                old.setStatus(InvoiceStatus.PAID); old.setPaidDate(issued.plusDays(2));
                old.setPaymentMethod("BANK_TRANSFER"); old.setPaymentReference("DEMO-" + old.getId());
                invoices.save(old);
            }
            // current period invoice
            Invoice cur = invoiceService.issue(s, start);
            boolean recent = start.isAfter(today.minusDays(14));
            boolean unpaidOld = i % 4 == 3 && i != 7 && !recent;
            if (!recent && !unpaidOld) {
                cur.setStatus(InvoiceStatus.PAID); cur.setPaidDate(start.plusDays(3));
                cur.setPaymentMethod(i % 2 == 0 ? "CARD" : "UPI"); cur.setPaymentReference("DEMO-" + cur.getId());
                invoices.save(cur);
            }
        }
        log.info("Demo data created. Login with admin / staff using the passwords configured in your environment.");
    }

    private AppUser user(String username, String fullName, String password, Role role) {
        AppUser u = new AppUser();
        u.setUsername(username); u.setFullName(fullName); u.setRole(role);
        u.setPasswordHash(encoder.encode(password));
        return u;
    }

    private Plan plan(String name, String desc, String price, BillingCycle cycle, String features) {
        Plan p = new Plan();
        p.setName(name); p.setDescription(desc); p.setPrice(new BigDecimal(price));
        p.setBillingCycle(cycle); p.setFeatures(features); p.setActive(true);
        return p;
    }

    public DataSeeder(UserRepository users, PlanRepository plans, CustomerRepository customers, SubscriptionRepository subs, InvoiceRepository invoices, InvoiceService invoiceService, PasswordEncoder encoder) { this.users = users; this.plans = plans; this.customers = customers; this.subs = subs; this.invoices = invoices; this.invoiceService = invoiceService; this.encoder = encoder; }
}
