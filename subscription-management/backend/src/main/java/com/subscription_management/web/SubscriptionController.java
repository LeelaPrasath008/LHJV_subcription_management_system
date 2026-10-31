package com.subscriptiq.web;

import com.subscriptiq.model.*;
import com.subscriptiq.repo.SubscriptionRepository;
import com.subscriptiq.service.*;
import jakarta.validation.Valid;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {
    private final SubscriptionRepository repo;
    private final SubscriptionService service;
    private final MaintenanceService maintenance;

    @GetMapping
    public Page<Subscription> list(@RequestParam(defaultValue = "") String q,
                                   @RequestParam(required = false) SubStatus status,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "10") int size) {
        maintenance.refreshStatuses();
        Pageable p = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200), Sort.by("id").descending());
        return status == null ? repo.search(q.trim(), p) : repo.searchByStatus(status, q.trim(), p);
    }

    @GetMapping("/{id}")
    public Subscription get(@PathVariable Long id) { return service.get(id); }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Subscription create(@Valid @RequestBody Dto.SubscriptionRequest r) { return service.create(r); }

    @PutMapping("/{id}")
    public Subscription update(@PathVariable Long id, @Valid @RequestBody Dto.SubscriptionRequest r) { return service.update(id, r); }

    @PostMapping("/{id}/renew")
    public Subscription renew(@PathVariable Long id) { return service.renew(id); }

    @PostMapping("/{id}/cancel")
    public Subscription cancel(@PathVariable Long id) { return service.cancel(id); }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { service.delete(id); }

    public SubscriptionController(SubscriptionRepository repo, SubscriptionService service, MaintenanceService maintenance) { this.repo = repo; this.service = service; this.maintenance = maintenance; }
}
