package com.subscriptiq.web;

import com.subscriptiq.model.Plan;
import com.subscriptiq.repo.*;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/plans")
public class PlanController {
    private final PlanRepository repo;
    private final SubscriptionRepository subs;

    @GetMapping
    public List<Plan> list() { return repo.findAll(Sort.by("price")); }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Plan create(@Valid @RequestBody Plan p) {
        p.setId(null);
        repo.findByNameIgnoreCase(p.getName()).ifPresent(x -> { throw new ConflictException("A plan with this name already exists"); });
        return repo.save(p);
    }

    @PutMapping("/{id}")
    public Plan update(@PathVariable Long id, @Valid @RequestBody Plan in) {
        Plan p = repo.findById(id).orElseThrow(() -> new NotFoundException("Plan not found"));
        repo.findByNameIgnoreCase(in.getName()).filter(x -> !x.getId().equals(id))
                .ifPresent(x -> { throw new ConflictException("A plan with this name already exists"); });
        p.setName(in.getName()); p.setDescription(in.getDescription()); p.setPrice(in.getPrice());
        p.setBillingCycle(in.getBillingCycle()); p.setFeatures(in.getFeatures()); p.setActive(in.isActive());
        return repo.save(p);
    }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        Plan p = repo.findById(id).orElseThrow(() -> new NotFoundException("Plan not found"));
        if (subs.existsByPlanId(id)) throw new ConflictException("Plan is used by subscriptions. Deactivate it instead.");
        repo.delete(p);
    }

    public PlanController(PlanRepository repo, SubscriptionRepository subs) { this.repo = repo; this.subs = subs; }
}
