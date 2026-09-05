package com.dealflow360.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("SELECT p FROM Product p JOIN FETCH p.category WHERE p.active = true")
    List<Product> findByActiveTrue();

    @Query("SELECT p FROM Product p JOIN FETCH p.category")
    List<Product> findAllWithCategory();

    @Query("SELECT p FROM Product p JOIN FETCH p.category WHERE p.category.id = :categoryId AND p.active = true")
    List<Product> findByCategoryIdAndActiveTrue(@Param("categoryId") Long categoryId);

    @Query("SELECT p FROM Product p JOIN FETCH p.category WHERE p.isSubscription = true")
    List<Product> findByIsSubscriptionTrue();

    @Query("SELECT p FROM Product p JOIN FETCH p.category WHERE p.id = :id")
    Optional<Product> findByIdWithCategory(@Param("id") Long id);

    @Query("SELECT p FROM Product p JOIN FETCH p.category WHERE p.id IN :ids")
    List<Product> findAllByIdInWithCategory(@Param("ids") Collection<Long> ids);
}

