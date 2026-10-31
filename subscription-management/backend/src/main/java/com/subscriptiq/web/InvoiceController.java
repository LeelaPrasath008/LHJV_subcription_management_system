package com.subscriptiq.web;

import com.subscriptiq.model.*;
import com.subscriptiq.repo.InvoiceRepository;
import com.subscriptiq.service.*;
import jakarta.validation.Valid;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {
    private final InvoiceRepository repo;
    private final InvoiceService service;
    private final SubscriptionService subscriptions;
    private final MaintenanceService maintenance;

    @GetMapping
    public Page<Invoice> list(@RequestParam(defaultValue = "") String q,
                              @RequestParam(required = false) InvoiceStatus status,
                              @RequestParam(defaultValue = "0") int page,
                              @RequestParam(defaultValue = "10") int size) {
        maintenance.refreshStatuses();
        Pageable p = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200), Sort.by("id").descending());
        return status == null ? repo.search(q.trim(), p) : repo.searchByStatus(status, q.trim(), p);
    }

    @GetMapping("/{id}")
    public Invoice get(@PathVariable Long id) {
        return repo.findById(id).orElseThrow(() -> new NotFoundException("Invoice not found"));
    }

    /** Manually generate an invoice for an existing, non-cancelled subscription. */
    @PostMapping("/generate/{subscriptionId}") @ResponseStatus(HttpStatus.CREATED)
    public Invoice generate(@PathVariable Long subscriptionId) {
        Subscription s = subscriptions.get(subscriptionId);
        if (s.getStatus() == SubStatus.CANCELLED) throw new ConflictException("Cannot invoice a cancelled subscription");
        return service.issue(s, LocalDate.now());
    }

    /** Records a received payment (manual tracking; no payment gateway is connected). */
    @PostMapping("/{id}/pay")
    public Invoice pay(@PathVariable Long id, @Valid @RequestBody Dto.PaymentRequest r) {
        return service.recordPayment(id, r);
    }

    public InvoiceController(InvoiceRepository repo, InvoiceService service, SubscriptionService subscriptions, MaintenanceService maintenance) { this.repo = repo; this.service = service; this.subscriptions = subscriptions; this.maintenance = maintenance; }
}
