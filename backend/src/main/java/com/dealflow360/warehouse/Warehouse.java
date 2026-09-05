package com.dealflow360.warehouse;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "warehouses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Warehouse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "warehouse_code", nullable = false, unique = true, length = 50)
    @JsonAlias({"code", "warehouseCode"})
    private String warehouseCode;

    @Column(nullable = false, unique = true, length = 100)
    @JsonAlias({"name", "warehouseName"})
    private String name; // Main Warehouse, East Depot

    @Column(nullable = false, length = 150)
    private String location;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, INACTIVE

    @Column(name = "shipping_cost_weight", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal shippingCostWeight = BigDecimal.valueOf(1.00);

    @Column(name = "base_freight", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal baseFreight = BigDecimal.valueOf(20.00);

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (warehouseCode == null || warehouseCode.trim().isEmpty()) {
            warehouseCode = "WH-" + (id != null ? String.format("%03d", id) : String.valueOf(System.currentTimeMillis() % 10000));
        }
        if (status == null || status.trim().isEmpty()) {
            status = "ACTIVE";
        }
        if (shippingCostWeight == null) {
            shippingCostWeight = BigDecimal.ONE;
        }
        if (baseFreight == null) {
            baseFreight = BigDecimal.valueOf(20.00);
        }
    }

    // Accessor aliases for seamless JSON serialization / deserialization
    @JsonProperty("code")
    public String getCode() {
        return warehouseCode;
    }

    public void setCode(String code) {
        this.warehouseCode = code;
    }

    @JsonProperty("warehouseName")
    public String getWarehouseName() {
        return name;
    }

    public void setWarehouseName(String warehouseName) {
        this.name = warehouseName;
    }
}
