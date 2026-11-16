package com.smarthire.security;

import com.smarthire.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPrincipal implements UserDetails {

    private Long id;
    private String email;
    private String password;
    private String fullName;
    private String role; // "HR" or "JOB_SEEKER" / "USER"
    private String companyName;
    private Collection<? extends GrantedAuthority> authorities;

    public static UserPrincipal create(User user) {
        String rawRole = user.getRole() != null ? user.getRole().trim().toUpperCase() : "USER";
        String normalizedRole = ("HR".equals(rawRole) || "RECRUITER".equals(rawRole)) ? "HR" : "JOB_SEEKER";

        List<GrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_" + normalizedRole)
        );

        return UserPrincipal.builder()
                .id(user.getId())
                .email(user.getEmail() != null ? user.getEmail().trim().toLowerCase() : "")
                .password(user.getPasswordHash())
                .fullName(user.getFullName())
                .role(normalizedRole)
                .companyName(user.getCompanyName())
                .authorities(authorities)
                .build();
    }

    public boolean isHr() {
        return "HR".equalsIgnoreCase(this.role) || "RECRUITER".equalsIgnoreCase(this.role);
    }

    public boolean isJobSeeker() {
        return !isHr();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
