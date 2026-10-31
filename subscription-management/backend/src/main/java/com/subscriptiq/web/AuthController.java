package com.subscriptiq.web;

import com.subscriptiq.repo.UserRepository;
import com.subscriptiq.model.AppUser;
import com.subscriptiq.model.Role;
import com.subscriptiq.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {
    private final AuthenticationManager authManager;
    private final UserRepository users;
    private final JwtService jwt;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/auth/login")
    public Dto.LoginResponse login(@Valid @RequestBody Dto.LoginRequest r) {
        authManager.authenticate(new UsernamePasswordAuthenticationToken(r.username(), r.password()));
        var u = users.findByUsername(r.username()).orElseThrow();
        return new Dto.LoginResponse(jwt.generate(u.getUsername(), u.getRole().name()),
                u.getUsername(), u.getFullName(), u.getRole().name());
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Dto.LoginResponse register(@Valid @RequestBody Dto.RegisterRequest r) {
        String username = r.username().trim();
        if (users.findByUsername(username).isPresent()) {
            throw new ConflictException("That username is already registered");
        }
        AppUser u = new AppUser();
        u.setUsername(username);
        u.setFullName(r.fullName().trim());
        u.setPasswordHash(passwordEncoder.encode(r.password()));
        // Public registration can never grant administrative privileges.
        u.setRole(Role.STAFF);
        u.setEnabled(true);
        u = users.save(u);
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

    public AuthController(AuthenticationManager authManager, UserRepository users, JwtService jwt, PasswordEncoder passwordEncoder) {
        this.authManager = authManager; this.users = users; this.jwt = jwt; this.passwordEncoder = passwordEncoder;
    }
}
