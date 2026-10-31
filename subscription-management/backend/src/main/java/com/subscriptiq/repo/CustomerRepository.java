package com.subscriptiq.repo;

import com.subscriptiq.model.Customer;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    @Query("select c from Customer c where lower(c.name) like lower(concat('%', :q, '%')) " +
           "or lower(c.email) like lower(concat('%', :q, '%')) " +
           "or lower(coalesce(c.company, '')) like lower(concat('%', :q, '%'))")
    Page<Customer> search(@Param("q") String q, Pageable pageable);

    Optional<Customer> findByEmailIgnoreCase(String email);
}
