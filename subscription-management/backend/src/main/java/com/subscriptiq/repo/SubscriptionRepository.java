package com.subscriptiq.repo;
import org.springframework.transaction.annotation.Transactional;
import com.subscriptiq.model.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    @Query("select s from Subscription s where lower(s.customer.name) like lower(concat('%', :q, '%')) " +
           "or lower(s.plan.name) like lower(concat('%', :q, '%'))")
    Page<Subscription> search(@Param("q") String q, Pageable pageable);

    @Query("select s from Subscription s where s.status = :status and (lower(s.customer.name) like lower(concat('%', :q, '%')) " +
           "or lower(s.plan.name) like lower(concat('%', :q, '%')))")
    Page<Subscription> searchByStatus(@Param("status") SubStatus status, @Param("q") String q, Pageable pageable);

    List<Subscription> findByStatus(SubStatus status);
    long countByStatus(SubStatus status);
    boolean existsByCustomerId(Long customerId);
    boolean existsByPlanId(Long planId);
    List<Subscription> findByStatusAndEndDateBetweenOrderByEndDate(SubStatus status, LocalDate from, LocalDate to);
    List<Subscription> findByStatusAndAutoRenewTrueAndEndDateBefore(SubStatus status, LocalDate date);

    @Modifying
    @Transactional
    @Query("update Subscription s set s.status = :to where s.status = :from and s.autoRenew = false and s.endDate < :today")
    int expireDue(@Param("to") SubStatus to, @Param("from") SubStatus from, @Param("today") LocalDate today);
}
