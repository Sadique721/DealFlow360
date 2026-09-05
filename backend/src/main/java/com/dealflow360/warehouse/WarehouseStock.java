package com.dealflow360.warehouse;

import com.dealflow360.catalog.Product;
import jakarta.persistence.*;
import lombok.*;

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
}
