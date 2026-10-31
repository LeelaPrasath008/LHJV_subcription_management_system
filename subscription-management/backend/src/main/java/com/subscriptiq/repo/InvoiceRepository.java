package com.subscriptiq.repo;

import com.subscriptiq.model.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Query("select i from Invoice i where lower(i.number) like lower(concat('%', :q, '%')) " +
           "or lower(i.subscription.customer.name) like lower(concat('%', :q, '%'))")
    Page<Invoice> search(@Param("q") String q, Pageable pageable);

    @Query("select i from Invoice i where i.status = :status and " +
           "(lower(i.number) like lower(concat('%', :q, '%')) " +
           "or lower(i.subscription.customer.name) like lower(concat('%', :q, '%')))")
    Page<Invoice> searchByStatus(
            @Param("status") InvoiceStatus status,
            @Param("q") String q,
            Pageable pageable
    );

    List<Invoice> findByStatus(InvoiceStatus status);

    List<Invoice> findByStatusOrderByDueDate(InvoiceStatus status);

    void deleteBySubscriptionId(Long subscriptionId);

    @Modifying
    @Transactional
    @Query("update Invoice i set i.status = :to " +
           "where i.status = :from and i.dueDate < :today")
    int markOverdue(
            @Param("to") InvoiceStatus to,
            @Param("from") InvoiceStatus from,
            @Param("today") LocalDate today
    );
}