package com.subscriptiq.web;

import com.subscriptiq.model.Customer;
import com.subscriptiq.repo.*;
import jakarta.validation.Valid;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {
    private final CustomerRepository repo;
    private final SubscriptionRepository subs;

    @GetMapping
    public Page<Customer> list(@RequestParam(defaultValue = "") String q,
                               @RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "10") int size) {
        return repo.search(q.trim(), PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200), Sort.by("id").descending()));
    }

    @GetMapping("/{id}")
    public Customer get(@PathVariable Long id) {
        return repo.findById(id).orElseThrow(() -> new NotFoundException("Customer not found"));
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Customer create(@Valid @RequestBody Customer c) {
        c.setId(null);
        repo.findByEmailIgnoreCase(c.getEmail()).ifPresent(x -> { throw new ConflictException("A customer with this email already exists"); });
        return repo.save(c);
    }

    @PutMapping("/{id}")
    public Customer update(@PathVariable Long id, @Valid @RequestBody Customer in) {
        Customer c = get(id);
        repo.findByEmailIgnoreCase(in.getEmail()).filter(x -> !x.getId().equals(id))
                .ifPresent(x -> { throw new ConflictException("A customer with this email already exists"); });
        c.setName(in.getName()); c.setEmail(in.getEmail()); c.setPhone(in.getPhone()); c.setCompany(in.getCompany());
        return repo.save(c);
    }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        Customer c = get(id);
        if (subs.existsByCustomerId(id)) throw new ConflictException("Customer has subscriptions. Delete or reassign them first.");
        repo.delete(c);
    }

    public CustomerController(CustomerRepository repo, SubscriptionRepository subs) { this.repo = repo; this.subs = subs; }
}
