package com.dealflow360.catalog;

import com.dealflow360.catalog.dto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class CatalogService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final PriceListRepository priceListRepository;
    private final CustomerRepository customerRepository;
    private final CustomerTierRepository customerTierRepository;
    private final ApprovalChainRepository approvalChainRepository;

    public CatalogService(CategoryRepository categoryRepository,
                          ProductRepository productRepository,
                          ProductVariantRepository productVariantRepository,
                          PriceListRepository priceListRepository,
                          CustomerRepository customerRepository,
                          CustomerTierRepository customerTierRepository,
                          ApprovalChainRepository approvalChainRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
        this.priceListRepository = priceListRepository;
        this.customerRepository = customerRepository;
        this.customerTierRepository = customerTierRepository;
        this.approvalChainRepository = approvalChainRepository;
    }

    // ==========================================
    // 1. CATEGORIES CRUD
    // ==========================================

    public List<CategoryResponse> getAllCategoriesDto() {
        return categoryRepository.findAll().stream()
                .map(this::mapToCategoryResponse)
                .collect(Collectors.toList());
    }

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));
    }

    public CategoryResponse getCategoryDtoById(Long id) {
        return mapToCategoryResponse(getCategoryById(id));
    }

    public CategoryResponse createCategory(CategoryRequest request) {
        validateCategoryRequest(request);
        Category category = Category.builder()
                .name(request.getName().trim())
                .maxDiscountPercent(request.getMaxDiscountPercent())
                .sensitivityGamma(request.getSensitivityGamma() != null ? request.getSensitivityGamma() : BigDecimal.valueOf(1.00))
                .description(request.getDescription())
                .build();
        return mapToCategoryResponse(categoryRepository.save(category));
    }

    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        validateCategoryRequest(request);
        Category category = getCategoryById(id);
        category.setName(request.getName().trim());
        category.setMaxDiscountPercent(request.getMaxDiscountPercent());
        if (request.getSensitivityGamma() != null) {
            category.setSensitivityGamma(request.getSensitivityGamma());
        }
        category.setDescription(request.getDescription());
        return mapToCategoryResponse(categoryRepository.save(category));
    }

    public void deleteCategory(Long id) {
        Category category = getCategoryById(id);
        categoryRepository.delete(category);
    }

    private void validateCategoryRequest(CategoryRequest req) {
        if (req.getName() == null || req.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Category name is required.");
        }
        if (req.getMaxDiscountPercent() == null || req.getMaxDiscountPercent().compareTo(BigDecimal.ZERO) < 0 || req.getMaxDiscountPercent().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Max discount percent must be between 0 and 100.");
        }
    }

    private CategoryResponse mapToCategoryResponse(Category c) {
        return CategoryResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .maxDiscountPercent(c.getMaxDiscountPercent())
                .sensitivityGamma(c.getSensitivityGamma())
                .description(c.getDescription())
                .build();
    }

    // ==========================================
    // 2. PRODUCTS CRUD
    // ==========================================

    public List<ProductResponse> getAllProductsDto(boolean includeInactive) {
        List<Product> products = includeInactive ? productRepository.findAllWithCategory() : productRepository.findByActiveTrue();
        return products.stream()
                .map(this::mapToProductResponse)
                .collect(Collectors.toList());
    }

    public List<Product> getAllProducts() {
        return productRepository.findByActiveTrue();
    }

    public Product getProductById(Long id) {
        return productRepository.findByIdWithCategory(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
    }

    public ProductResponse getProductDtoById(Long id) {
        return mapToProductResponse(getProductById(id));
    }

    public ProductResponse createProduct(ProductRequest request) {
        validateProductRequest(request);
        Category category = getCategoryById(request.getCategoryId());

        Product product = Product.builder()
                .name(request.getName().trim())
                .category(category)
                .basePrice(request.getBasePrice())
                .costPrice(request.getCostPrice() != null ? request.getCostPrice() : BigDecimal.ZERO)
                .unitOfMeasure(request.getUnitOfMeasure() != null ? request.getUnitOfMeasure() : "Unit")
                .taxPercentage(request.getTaxPercentage() != null ? request.getTaxPercentage() : BigDecimal.valueOf(15.00))
                .isSubscription(Boolean.TRUE.equals(request.getIsSubscription()))
                .recurringInterval(request.getRecurringInterval())
                .stockOnHand(request.getStockOnHand() != null ? request.getStockOnHand() : 0)
                .active(request.getActive() != null ? request.getActive() : true)
                .description(request.getDescription())
                .createdAt(LocalDateTime.now())
                .build();

        return mapToProductResponse(productRepository.save(product));
    }

    public ProductResponse updateProduct(Long id, ProductRequest request) {
        validateProductRequest(request);
        Product product = getProductById(id);

        if (request.getCategoryId() != null) {
            Category category = getCategoryById(request.getCategoryId());
            product.setCategory(category);
        }

        product.setName(request.getName().trim());
        product.setBasePrice(request.getBasePrice());
        if (request.getCostPrice() != null) product.setCostPrice(request.getCostPrice());
        if (request.getUnitOfMeasure() != null) product.setUnitOfMeasure(request.getUnitOfMeasure());
        if (request.getTaxPercentage() != null) product.setTaxPercentage(request.getTaxPercentage());
        if (request.getIsSubscription() != null) product.setIsSubscription(request.getIsSubscription());
        product.setRecurringInterval(request.getRecurringInterval());
        if (request.getStockOnHand() != null) product.setStockOnHand(request.getStockOnHand());
        if (request.getActive() != null) product.setActive(request.getActive());
        product.setDescription(request.getDescription());

        return mapToProductResponse(productRepository.save(product));
    }

    public void deleteProduct(Long id) {
        Product product = getProductById(id);
        // Soft delete / deactivate by default to maintain referential integrity
        product.setActive(false);
        productRepository.save(product);
    }

    private void validateProductRequest(ProductRequest req) {
        if (req.getName() == null || req.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Product name is required.");
        }
        if (req.getCategoryId() == null) {
            throw new IllegalArgumentException("Category ID is required.");
        }
        if (req.getBasePrice() == null || req.getBasePrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Base price must be a non-negative number.");
        }
    }

    private ProductResponse mapToProductResponse(Product p) {
        BigDecimal margin = BigDecimal.ZERO;
        if (p.getBasePrice() != null && p.getBasePrice().compareTo(BigDecimal.ZERO) > 0 && p.getCostPrice() != null) {
            margin = p.getBasePrice().subtract(p.getCostPrice())
                    .divide(p.getBasePrice(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(1, RoundingMode.HALF_UP);
        }

        return ProductResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .categoryId(p.getCategory() != null ? p.getCategory().getId() : null)
                .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                .categoryMaxDiscount(p.getCategory() != null ? p.getCategory().getMaxDiscountPercent() : null)
                .basePrice(p.getBasePrice())
                .costPrice(p.getCostPrice())
                .marginPercent(margin)
                .unitOfMeasure(p.getUnitOfMeasure())
                .taxPercentage(p.getTaxPercentage())
                .isSubscription(p.getIsSubscription())
                .recurringInterval(p.getRecurringInterval())
                .stockOnHand(p.getStockOnHand())
                .active(p.getActive())
                .description(p.getDescription())
                .createdAt(p.getCreatedAt())
                .build();
    }

    // ==========================================
    // 3. PRICE LISTS CRUD
    // ==========================================

    public List<PriceListResponse> getAllPriceListsDto() {
        return priceListRepository.findAll().stream()
                .map(this::mapToPriceListResponse)
                .collect(Collectors.toList());
    }

    public List<PriceList> getAllPriceLists() {
        return priceListRepository.findAll();
    }

    public PriceList getPriceListById(Long id) {
        return priceListRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Price list not found: " + id));
    }

    public PriceListResponse getPriceListDtoById(Long id) {
        return mapToPriceListResponse(getPriceListById(id));
    }

    public PriceListResponse createPriceList(PriceListRequest request) {
        validatePriceListRequest(request);
        PriceList priceList = PriceList.builder()
                .customerTier(request.getCustomerTier().toUpperCase().trim())
                .currency(request.getCurrency() != null ? request.getCurrency().toUpperCase().trim() : "USD")
                .discountAdjustmentPercent(request.getDiscountAdjustmentPercent() != null ? request.getDiscountAdjustmentPercent() : BigDecimal.ZERO)
                .build();
        return mapToPriceListResponse(priceListRepository.save(priceList));
    }

    public PriceListResponse updatePriceList(Long id, PriceListRequest request) {
        validatePriceListRequest(request);
        PriceList priceList = getPriceListById(id);
        priceList.setCustomerTier(request.getCustomerTier().toUpperCase().trim());
        if (request.getCurrency() != null) priceList.setCurrency(request.getCurrency().toUpperCase().trim());
        if (request.getDiscountAdjustmentPercent() != null) priceList.setDiscountAdjustmentPercent(request.getDiscountAdjustmentPercent());
        return mapToPriceListResponse(priceListRepository.save(priceList));
    }

    public void deletePriceList(Long id) {
        PriceList priceList = getPriceListById(id);
        priceListRepository.delete(priceList);
    }

    private void validatePriceListRequest(PriceListRequest req) {
        if (req.getCustomerTier() == null || req.getCustomerTier().trim().isEmpty()) {
            throw new IllegalArgumentException("Customer tier is required (e.g. BRONZE, SILVER, GOLD).");
        }
    }

    private PriceListResponse mapToPriceListResponse(PriceList pl) {
        return PriceListResponse.builder()
                .id(pl.getId())
                .customerTier(pl.getCustomerTier())
                .currency(pl.getCurrency())
                .discountAdjustmentPercent(pl.getDiscountAdjustmentPercent())
                .build();
    }

    // ==========================================
    // 4. CUSTOMERS CRUD
    // ==========================================

    public List<CustomerResponse> getAllCustomersDto() {
        return customerRepository.findAll().stream()
                .map(this::mapToCustomerResponse)
                .collect(Collectors.toList());
    }

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public Customer getCustomerById(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found: " + id));
    }

    public CustomerResponse getCustomerDtoById(Long id) {
        return mapToCustomerResponse(getCustomerById(id));
    }

    public CustomerResponse createCustomer(CustomerRequest request) {
        validateCustomerRequest(request);
        Customer customer = Customer.builder()
                .name(request.getName().trim())
                .tier(request.getTier().toUpperCase().trim())
                .email(request.getEmail().trim())
                .contactPerson(request.getContactPerson())
                .phone(request.getPhone())
                .address(request.getAddress())
                .portalUserId(request.getPortalUserId())
                .createdAt(LocalDateTime.now())
                .build();
        return mapToCustomerResponse(customerRepository.save(customer));
    }

    public CustomerResponse updateCustomer(Long id, CustomerRequest request) {
        validateCustomerRequest(request);
        Customer customer = getCustomerById(id);
        customer.setName(request.getName().trim());
        customer.setTier(request.getTier().toUpperCase().trim());
        customer.setEmail(request.getEmail().trim());
        customer.setContactPerson(request.getContactPerson());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());
        if (request.getPortalUserId() != null) {
            customer.setPortalUserId(request.getPortalUserId());
        }
        return mapToCustomerResponse(customerRepository.save(customer));
    }

    public void deleteCustomer(Long id) {
        Customer customer = getCustomerById(id);
        customerRepository.delete(customer);
    }

    public Customer saveCustomer(Customer customer) {
        return customerRepository.save(customer);
    }

    private void validateCustomerRequest(CustomerRequest req) {
        if (req.getName() == null || req.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Customer name is required.");
        }
        if (req.getTier() == null || req.getTier().trim().isEmpty()) {
            throw new IllegalArgumentException("Customer tier is required (e.g. BRONZE, SILVER, GOLD).");
        }
        if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Customer email is required.");
        }
    }

    private CustomerResponse mapToCustomerResponse(Customer c) {
        BigDecimal maxDisc = BigDecimal.valueOf(5.00);
        if (c.getTier() != null) {
            maxDisc = customerTierRepository.findByTierNameIgnoreCase(c.getTier())
                    .map(CustomerTier::getMaxDiscountPercent)
                    .orElse(BigDecimal.valueOf(5.00));
        }
        return CustomerResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .tier(c.getTier())
                .tierMaxDiscount(maxDisc)
                .email(c.getEmail())
                .contactPerson(c.getContactPerson())
                .phone(c.getPhone())
                .address(c.getAddress())
                .portalUserId(c.getPortalUserId())
                .createdAt(c.getCreatedAt())
                .build();
    }

    // ==========================================
    // 5. CUSTOMER TIERS (DISCOUNT TIERS) CRUD
    // ==========================================

    public List<CustomerTierResponse> getAllCustomerTiersDto() {
        return customerTierRepository.findAll().stream()
                .map(this::mapToCustomerTierResponse)
                .collect(Collectors.toList());
    }

    public List<CustomerTier> getAllCustomerTiers() {
        return customerTierRepository.findAll();
    }

    public CustomerTier getCustomerTierById(Long id) {
        return customerTierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer tier not found: " + id));
    }

    public CustomerTierResponse getCustomerTierDtoById(Long id) {
        return mapToCustomerTierResponse(getCustomerTierById(id));
    }

    public CustomerTierResponse createCustomerTier(CustomerTierRequest request) {
        validateCustomerTierRequest(request);
        CustomerTier tier = CustomerTier.builder()
                .tierName(request.getTierName().toUpperCase().trim())
                .maxDiscountPercent(request.getMaxDiscountPercent())
                .description(request.getDescription())
                .build();
        return mapToCustomerTierResponse(customerTierRepository.save(tier));
    }

    public CustomerTierResponse updateCustomerTier(Long id, CustomerTierRequest request) {
        validateCustomerTierRequest(request);
        CustomerTier tier = getCustomerTierById(id);
        tier.setTierName(request.getTierName().toUpperCase().trim());
        tier.setMaxDiscountPercent(request.getMaxDiscountPercent());
        tier.setDescription(request.getDescription());
        return mapToCustomerTierResponse(customerTierRepository.save(tier));
    }

    public void deleteCustomerTier(Long id) {
        CustomerTier tier = getCustomerTierById(id);
        customerTierRepository.delete(tier);
    }

    private void validateCustomerTierRequest(CustomerTierRequest req) {
        if (req.getTierName() == null || req.getTierName().trim().isEmpty()) {
            throw new IllegalArgumentException("Tier name is required.");
        }
        if (req.getMaxDiscountPercent() == null || req.getMaxDiscountPercent().compareTo(BigDecimal.ZERO) < 0 || req.getMaxDiscountPercent().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Max discount percent must be between 0 and 100.");
        }
    }

    private CustomerTierResponse mapToCustomerTierResponse(CustomerTier t) {
        return CustomerTierResponse.builder()
                .id(t.getId())
                .tierName(t.getTierName())
                .maxDiscountPercent(t.getMaxDiscountPercent())
                .description(t.getDescription())
                .build();
    }

    // ==========================================
    // 6. APPROVAL CHAINS CRUD
    // ==========================================

    public List<ApprovalChainResponse> getAllApprovalChainsDto() {
        return approvalChainRepository.findAllByOrderByMinScoreAsc().stream()
                .map(this::mapToApprovalChainResponse)
                .collect(Collectors.toList());
    }

    public List<ApprovalChain> getAllApprovalChains() {
        return approvalChainRepository.findAllByOrderByMinScoreAsc();
    }

    public ApprovalChain getApprovalChainById(Long id) {
        return approvalChainRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Approval chain rule not found: " + id));
    }

    public ApprovalChainResponse getApprovalChainDtoById(Long id) {
        return mapToApprovalChainResponse(getApprovalChainById(id));
    }

    public ApprovalChainResponse createApprovalChain(ApprovalChainRequest request) {
        validateApprovalChainRequest(request);
        ApprovalChain chain = ApprovalChain.builder()
                .minScore(request.getMinScore())
                .maxScore(request.getMaxScore())
                .requiredLevel(request.getRequiredLevel().toUpperCase().trim())
                .description(request.getDescription())
                .build();
        return mapToApprovalChainResponse(approvalChainRepository.save(chain));
    }

    public ApprovalChainResponse updateApprovalChain(Long id, ApprovalChainRequest request) {
        validateApprovalChainRequest(request);
        ApprovalChain chain = getApprovalChainById(id);
        chain.setMinScore(request.getMinScore());
        chain.setMaxScore(request.getMaxScore());
        chain.setRequiredLevel(request.getRequiredLevel().toUpperCase().trim());
        chain.setDescription(request.getDescription());
        return mapToApprovalChainResponse(approvalChainRepository.save(chain));
    }

    public void deleteApprovalChain(Long id) {
        ApprovalChain chain = getApprovalChainById(id);
        approvalChainRepository.delete(chain);
    }

    private void validateApprovalChainRequest(ApprovalChainRequest req) {
        if (req.getMinScore() == null || req.getMinScore().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Min risk score must be non-negative.");
        }
        if (req.getMaxScore() == null || req.getMaxScore().compareTo(req.getMinScore()) < 0) {
            throw new IllegalArgumentException("Max risk score must be greater than or equal to min risk score.");
        }
        if (req.getRequiredLevel() == null || req.getRequiredLevel().trim().isEmpty()) {
            throw new IllegalArgumentException("Required level is required (e.g. MANAGER, MANAGER_THEN_FINANCE).");
        }
    }

    private ApprovalChainResponse mapToApprovalChainResponse(ApprovalChain c) {
        return ApprovalChainResponse.builder()
                .id(c.getId())
                .minScore(c.getMinScore())
                .maxScore(c.getMaxScore())
                .requiredLevel(c.getRequiredLevel())
                .description(c.getDescription())
                .build();
    }

    // ==========================================
    // 7. PRODUCT VARIANTS
    // ==========================================

    public List<ProductVariant> getProductVariants(Long productId) {
        return productVariantRepository.findByProductId(productId);
    }

    public ProductVariant saveProductVariant(ProductVariant variant) {
        return productVariantRepository.save(variant);
    }
}

