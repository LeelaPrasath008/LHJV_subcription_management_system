package com.subscriptiq.web;

import com.subscriptiq.repo.UserRepository;
import com.subscriptiq.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {
    private final AuthenticationManager authManager;
    private final UserRepository users;
    private final JwtService jwt;

    @PostMapping("/auth/login")
    public Dto.LoginResponse login(@Valid @RequestBody Dto.LoginRequest r) {
        authManager.authenticate(new UsernamePasswordAuthenticationToken(r.username(), r.password()));
        var u = users.findByUsername(r.username()).orElseThrow();
        return new Dto.LoginResponse(jwt.generate(u.getUsername(), u.getRole().name()),
                u.getUsername(), u.getFullName(), u.getRole().name());
    }

    @GetMapping("/auth/me")
    public Map<String, String> me(Authentication a) {
        var u = users.findByUsername(a.getName()).orElseThrow();
        return Map.of("username", u.getUsername(), "fullName", u.getFullName(), "role", u.getRole().name());
    }

    @GetMapping("/health")
    public Map<String, String> health() { return Map.of("status", "UP"); }

    public AuthController(AuthenticationManager authManager, UserRepository users, JwtService jwt) { this.authManager = authManager; this.users = users; this.jwt = jwt; }
}
