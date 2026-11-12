
package com.smarthire.repository;

import com.smarthire.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>
{

    // Find user by email
    Optional<User> findByEmail(String email);

    // Check whether email already exists
    boolean existsByEmail(String email);

    // Find users by multiple roles (e.g. HR, RECRUITER)
    List<User> findByRoleIn(List<String> roles);

    // Find users by single role
    List<User> findByRoleIgnoreCase(String role);
}
