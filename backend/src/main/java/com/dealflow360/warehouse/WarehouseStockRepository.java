package com.dealflow360.warehouse;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseStockRepository extends JpaRepository<WarehouseStock, Long> {
    List<WarehouseStock> findByWarehouseId(Long warehouseId);

    List<WarehouseStock> findByProductId(Long productId);

    Optional<WarehouseStock> findByWarehouseIdAndProductId(Long warehouseId, Long productId);

    boolean existsByWarehouseIdAndProductId(Long warehouseId, Long productId);

    @Query("SELECT s FROM WarehouseStock s WHERE s.warehouse.id = :warehouseId ORDER BY COALESCE(s.createdAt, CURRENT_TIMESTAMP) DESC, s.id DESC")
    List<WarehouseStock> findByWarehouseIdNewestFirst(@Param("warehouseId") Long warehouseId);
}
