package com.dealflow360.warehouse;

import com.dealflow360.catalog.Product;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "warehouse_stocks", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"warehouse_id", "product_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "in_stock", nullable = false)
    @Builder.Default
    private Integer inStock = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer reserved = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer available = 0;

    @Column(name = "reorder_level")
    @Builder.Default
    private Integer reorderLevel = 10;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void calculateAvailable() {
        if (inStock == null) inStock = 0;
        if (reserved == null) reserved = 0;
        if (reorderLevel == null) reorderLevel = 10;
        available = Math.max(0, inStock - reserved);
    }

    @JsonProperty("stockStatus")
    public String getStockStatus() {
        if (available == null || available <= 0) {
            return "OUT OF STOCK";
        }
        if (reorderLevel != null && available < reorderLevel) {
            return "LOW STOCK";
        }
        return "NORMAL";
    }
}
