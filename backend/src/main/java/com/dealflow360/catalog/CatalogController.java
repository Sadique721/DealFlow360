package com.dealflow360.catalog;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/catalog")
@Tag(name = "Catalog & Master Data", description = "Endpoints for products, categories, variants, price lists, and customer profiles")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/products")
    @Operation(summary = "List all active sellable products")
    public ResponseEntity<List<Product>> getProducts() {
        return ResponseEntity.ok(catalogService.getAllProducts());
    }

    @GetMapping("/products/{id}")
    @Operation(summary = "Get product by ID")
    public ResponseEntity<Product> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.getProductById(id));
    }

    @PostMapping("/products")
    @Operation(summary = "Create or update product")
    public ResponseEntity<Product> saveProduct(@RequestBody Product product) {
        return ResponseEntity.ok(catalogService.saveProduct(product));
    }

    @GetMapping("/products/{id}/variants")
    @Operation(summary = "List variants for a specific product")
    public ResponseEntity<List<ProductVariant>> getVariants(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.getProductVariants(id));
    }

    @PostMapping("/products/{id}/variants")
    @Operation(summary = "Add variant to product")
    public ResponseEntity<ProductVariant> addVariant(@PathVariable Long id, @RequestBody ProductVariant variant) {
        variant.setProductId(id);
        return ResponseEntity.ok(catalogService.saveProductVariant(variant));
    }

    @GetMapping("/categories")
    @Operation(summary = "List product categories with discount ceilings and sensitivity gamma")
    public ResponseEntity<List<Category>> getCategories() {
        return ResponseEntity.ok(catalogService.getAllCategories());
    }

    @PostMapping("/categories")
    @Operation(summary = "Create or update product category")
    public ResponseEntity<Category> saveCategory(@RequestBody Category category) {
        return ResponseEntity.ok(catalogService.saveCategory(category));
    }

    @GetMapping("/price-lists")
    @Operation(summary = "List tier price adjustment rules")
    public ResponseEntity<List<PriceList>> getPriceLists() {
        return ResponseEntity.ok(catalogService.getAllPriceLists());
    }

    @GetMapping("/customer-tiers")
    @Operation(summary = "List customer tiers and discount allowances")
    public ResponseEntity<List<CustomerTier>> getCustomerTiers() {
        return ResponseEntity.ok(catalogService.getAllCustomerTiers());
    }

    @GetMapping("/customers")
    @Operation(summary = "List all customer accounts")
    public ResponseEntity<List<Customer>> getCustomers() {
        return ResponseEntity.ok(catalogService.getAllCustomers());
    }

    @GetMapping("/customers/{id}")
    @Operation(summary = "Get customer account by ID")
    public ResponseEntity<Customer> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.getCustomerById(id));
    }

    @PostMapping("/customers")
    @Operation(summary = "Create or update customer account")
    public ResponseEntity<Customer> saveCustomer(@RequestBody Customer customer) {
        return ResponseEntity.ok(catalogService.saveCustomer(customer));
    }
}
