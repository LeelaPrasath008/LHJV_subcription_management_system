package com.subscription_management.security;

import com.subscriptiq.repo.UserRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {
    private final UserRepository users;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        var u = users.findByUsername(username).orElseThrow(() -> new UsernameNotFoundException("Unknown user"));
        return User.withUsername(u.getUsername()).password(u.getPasswordHash())
                .roles(u.getRole().name()).disabled(!u.isEnabled()).build();
    }

    public AppUserDetailsService(UserRepository users) { this.users = users; }
}
