package com.dealflow360.warehouse;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {
    Optional<Warehouse> findByName(String name);

    Optional<Warehouse> findByWarehouseCode(String warehouseCode);

    boolean existsByWarehouseCode(String warehouseCode);

    boolean existsByName(String name);

    @Query("SELECT w FROM Warehouse w ORDER BY COALESCE(w.createdAt, CURRENT_TIMESTAMP) DESC, w.id DESC")
    List<Warehouse> findAllOrderByNewestFirst();
}
