package com.subscriptiq.web;

import com.subscriptiq.model.*;
import com.subscriptiq.repo.InvoiceRepository;
import com.subscriptiq.service.DashboardService;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api")
public class DashboardController {
    private final DashboardService service;
    private final InvoiceRepository invoices;

    @GetMapping("/dashboard")
    public Dto.Dashboard dashboard() { return service.dashboard(); }

    @GetMapping("/alerts")
    public Dto.Alerts alerts() { return service.alerts(); }

    @GetMapping("/reports")
    public Dto.Report report() { return service.report(); }

    @GetMapping("/reports/invoices.csv")
    @Transactional
    public ResponseEntity<byte[]> invoicesCsv() {
        StringBuilder sb = new StringBuilder("Number,Customer,Plan,Amount,Issued,Due,Status,Paid on,Method,Reference\n");
        for (Invoice i : invoices.findAll()) {
            Subscription s = i.getSubscription();
            sb.append(String.join(",", csv(i.getNumber()), csv(s.getCustomer().getName()), csv(s.getPlan().getName()),
                    i.getAmount().toPlainString(), String.valueOf(i.getIssueDate()), String.valueOf(i.getDueDate()),
                    i.getStatus().name(), i.getPaidDate() == null ? "" : i.getPaidDate().toString(),
                    csv(i.getPaymentMethod()), csv(i.getPaymentReference()))).append('\n');
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=invoices.csv")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(sb.toString().getBytes(StandardCharsets.UTF_8));
    }

    private static String csv(String v) {
        if (v == null) return "";
        String x = v.replace("\"", "\"\"");
        // neutralise spreadsheet formula injection
        if (!x.isEmpty() && "=+-@".indexOf(x.charAt(0)) >= 0) x = "'" + x;
        return "\"" + x + "\"";
    }

    public DashboardController(DashboardService service, InvoiceRepository invoices) { this.service = service; this.invoices = invoices; }
}
