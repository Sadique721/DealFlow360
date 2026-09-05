package com.dealflow360.catalog;

import com.dealflow360.catalog.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/catalog")
@Tag(name = "Catalog & Master Data", description = "Endpoints for products, categories, variants, price lists, and customer master data")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    // ==========================================
    // 1. PRODUCTS ENDPOINTS
    // ==========================================

    @GetMapping("/products")
    @Operation(summary = "List all active sellable products")
    public ResponseEntity<List<ProductResponse>> getProducts() {
        return ResponseEntity.ok(catalogService.getAllProductsDto(false));
    }

    @GetMapping("/products/all")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all products including inactive (Admin only)")
    public ResponseEntity<List<ProductResponse>> getAllProductsAdmin() {
        return ResponseEntity.ok(catalogService.getAllProductsDto(true));
    }

    @GetMapping("/products/{id}")
    @Operation(summary = "Get product by ID")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.getProductDtoById(id));
    }

    @PostMapping("/products")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create product (Admin only)")
    public ResponseEntity<ProductResponse> createProduct(@RequestBody ProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogService.createProduct(request));
    }

    @PutMapping("/products/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update product (Admin only)")
    public ResponseEntity<ProductResponse> updateProduct(@PathVariable Long id, @RequestBody ProductRequest request) {
        return ResponseEntity.ok(catalogService.updateProduct(id, request));
    }

    @DeleteMapping("/products/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete / deactivate product (Admin only)")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        catalogService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/products/{id}/variants")
    @Operation(summary = "List variants for a specific product")
    public ResponseEntity<List<ProductVariant>> getVariants(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.getProductVariants(id));
    }

    @PostMapping("/products/{id}/variants")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Add variant to product (Admin only)")
    public ResponseEntity<ProductVariant> addVariant(@PathVariable Long id, @RequestBody ProductVariant variant) {
        variant.setProductId(id);
        return ResponseEntity.ok(catalogService.saveProductVariant(variant));
    }

    // ==========================================
    // 2. CATEGORIES ENDPOINTS
    // ==========================================

    @GetMapping("/categories")
    @Operation(summary = "List product categories with discount ceilings and sensitivity gamma")
    public ResponseEntity<List<CategoryResponse>> getCategories() {
        return ResponseEntity.ok(catalogService.getAllCategoriesDto());
    }

    @GetMapping("/categories/{id}")
    @Operation(summary = "Get product category by ID")
    public ResponseEntity<CategoryResponse> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.getCategoryDtoById(id));
    }

    @PostMapping("/categories")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create product category (Admin only)")
    public ResponseEntity<CategoryResponse> createCategory(@RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogService.createCategory(request));
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update product category (Admin only)")
    public ResponseEntity<CategoryResponse> updateCategory(@PathVariable Long id, @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(catalogService.updateCategory(id, request));
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete product category (Admin only)")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        catalogService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // 3. PRICE LISTS ENDPOINTS
    // ==========================================

    @GetMapping("/price-lists")
    @Operation(summary = "List tier price adjustment rules")
    public ResponseEntity<List<PriceListResponse>> getPriceLists() {
        return ResponseEntity.ok(catalogService.getAllPriceListsDto());
    }

    @GetMapping("/price-lists/{id}")
    @Operation(summary = "Get price list by ID")
    public ResponseEntity<PriceListResponse> getPriceListById(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.getPriceListDtoById(id));
    }

    @PostMapping("/price-lists")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create tier price list adjustment (Admin only)")
    public ResponseEntity<PriceListResponse> createPriceList(@RequestBody PriceListRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogService.createPriceList(request));
    }

    @PutMapping("/price-lists/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update tier price list adjustment (Admin only)")
    public ResponseEntity<PriceListResponse> updatePriceList(@PathVariable Long id, @RequestBody PriceListRequest request) {
        return ResponseEntity.ok(catalogService.updatePriceList(id, request));
    }

    @DeleteMapping("/price-lists/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete tier price list adjustment (Admin only)")
    public ResponseEntity<Void> deletePriceList(@PathVariable Long id) {
        catalogService.deletePriceList(id);
        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // 4. CUSTOMER MASTER DATA ENDPOINTS
    // ==========================================

    @GetMapping("/customers")
    @Operation(summary = "List all customer accounts (DTO)")
    public ResponseEntity<List<CustomerResponse>> getCustomers() {
        return ResponseEntity.ok(catalogService.getAllCustomersDto());
    }

    @GetMapping("/customers/{id}")
    @Operation(summary = "Get customer account by ID (DTO)")
    public ResponseEntity<CustomerResponse> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.getCustomerDtoById(id));
    }

    @PostMapping("/customers")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create customer account (Admin only)")
    public ResponseEntity<CustomerResponse> createCustomer(@RequestBody CustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogService.createCustomer(request));
    }

    @PutMapping("/customers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update customer account (Admin only)")
    public ResponseEntity<CustomerResponse> updateCustomer(@PathVariable Long id, @RequestBody CustomerRequest request) {
        return ResponseEntity.ok(catalogService.updateCustomer(id, request));
    }

    @DeleteMapping("/customers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete customer account (Admin only)")
    public ResponseEntity<Void> deleteCustomer(@PathVariable Long id) {
        catalogService.deleteCustomer(id);
        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // 5. CUSTOMER TIERS (DISCOUNT TIERS) ENDPOINTS
    // ==========================================

    @GetMapping("/customer-tiers")
    @Operation(summary = "List customer tiers and discount allowances (DTO)")
    public ResponseEntity<List<CustomerTierResponse>> getCustomerTiers() {
        return ResponseEntity.ok(catalogService.getAllCustomerTiersDto());
    }

    @GetMapping("/customer-tiers/{id}")
    @Operation(summary = "Get customer tier by ID (DTO)")
    public ResponseEntity<CustomerTierResponse> getCustomerTierById(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.getCustomerTierDtoById(id));
    }

    @PostMapping("/customer-tiers")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create customer tier (Admin only)")
    public ResponseEntity<CustomerTierResponse> createCustomerTier(@RequestBody CustomerTierRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogService.createCustomerTier(request));
    }

    @PutMapping("/customer-tiers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update customer tier (Admin only)")
    public ResponseEntity<CustomerTierResponse> updateCustomerTier(@PathVariable Long id, @RequestBody CustomerTierRequest request) {
        return ResponseEntity.ok(catalogService.updateCustomerTier(id, request));
    }

    @DeleteMapping("/customer-tiers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete customer tier (Admin only)")
    public ResponseEntity<Void> deleteCustomerTier(@PathVariable Long id) {
        catalogService.deleteCustomerTier(id);
        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // 6. APPROVAL CHAINS ENDPOINTS
    // ==========================================

    @GetMapping("/approval-chains")
    @Operation(summary = "List approval routing chains (DTO)")
    public ResponseEntity<List<ApprovalChainResponse>> getApprovalChains() {
        return ResponseEntity.ok(catalogService.getAllApprovalChainsDto());
    }

    @GetMapping("/approval-chains/{id}")
    @Operation(summary = "Get approval routing chain by ID (DTO)")
    public ResponseEntity<ApprovalChainResponse> getApprovalChainById(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.getApprovalChainDtoById(id));
    }

    @PostMapping("/approval-chains")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create approval routing chain rule (Admin only)")
    public ResponseEntity<ApprovalChainResponse> createApprovalChain(@RequestBody ApprovalChainRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogService.createApprovalChain(request));
    }

    @PutMapping("/approval-chains/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update approval routing chain rule (Admin only)")
    public ResponseEntity<ApprovalChainResponse> updateApprovalChain(@PathVariable Long id, @RequestBody ApprovalChainRequest request) {
        return ResponseEntity.ok(catalogService.updateApprovalChain(id, request));
    }

    @DeleteMapping("/approval-chains/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete approval routing chain rule (Admin only)")
    public ResponseEntity<Void> deleteApprovalChain(@PathVariable Long id) {
        catalogService.deleteApprovalChain(id);
        return ResponseEntity.noContent().build();
    }
}

