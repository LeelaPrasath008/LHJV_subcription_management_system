package com.subscriptiq.web;

import com.subscriptiq.service.RenewalIntelligenceService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/insights")
public class RenewalIntelligenceController {
    private final RenewalIntelligenceService service;

    public RenewalIntelligenceController(RenewalIntelligenceService service) {
        this.service = service;
    }

    /** Accessible to authenticated users; hide the navigation link for staff if desired. */
    @GetMapping("/renewal-risk")
    public List<RenewalIntelligenceService.RiskItem> renewalRisk() {
        return service.getRiskItems();
    }
}