package com.subscriptiq.service;

import com.subscriptiq.model.*;
import com.subscriptiq.repo.InvoiceRepository;
import com.subscriptiq.web.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.UUID;

@Service
public class InvoiceService {
    private final InvoiceRepository invoices;
    @Value("${app.invoice-due-days:14}") private int dueDays;

    /** Creates a PENDING invoice for one billing period of the subscription's plan. */
    @Transactional
    public Invoice issue(Subscription s, LocalDate issueDate) {
        Invoice i = new Invoice();
        i.setNumber(UUID.randomUUID().toString()); // placeholder, replaced once the id is known
        i.setSubscription(s);
        i.setAmount(s.getPlan().getPrice());
        i.setIssueDate(issueDate);
        i.setDueDate(issueDate.plusDays(dueDays));
        i.setStatus(InvoiceStatus.PENDING);
        i = invoices.save(i);
        i.setNumber(String.format("INV-%06d", i.getId()));
        return invoices.save(i);
    }

    /** Records that a payment was received. No payment gateway is involved. */
    @Transactional
    public Invoice recordPayment(Long id, Dto.PaymentRequest r) {
        Invoice i = invoices.findById(id).orElseThrow(() -> new NotFoundException("Invoice not found"));
        if (i.getStatus() == InvoiceStatus.PAID) throw new ConflictException("Invoice is already paid");
        i.setStatus(InvoiceStatus.PAID);
        i.setPaidDate(LocalDate.now());
        i.setPaymentMethod(r.method());
        i.setPaymentReference(r.reference());
        return invoices.save(i);
    }

    public InvoiceService(InvoiceRepository invoices) { this.invoices = invoices; }
}
