package com.dealflow360.catalog;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class CatalogService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final PriceListRepository priceListRepository;
    private final CustomerRepository customerRepository;
    private final CustomerTierRepository customerTierRepository;

    public CatalogService(CategoryRepository categoryRepository,
                          ProductRepository productRepository,
                          ProductVariantRepository productVariantRepository,
                          PriceListRepository priceListRepository,
                          CustomerRepository customerRepository,
                          CustomerTierRepository customerTierRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
        this.priceListRepository = priceListRepository;
        this.customerRepository = customerRepository;
        this.customerTierRepository = customerTierRepository;
    }

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id).orElseThrow(() -> new RuntimeException("Category not found: " + id));
    }

    public Category saveCategory(Category category) {
        return categoryRepository.save(category);
    }

    public List<Product> getAllProducts() {
        return productRepository.findByActiveTrue();
    }

    public Product getProductById(Long id) {
        return productRepository.findById(id).orElseThrow(() -> new RuntimeException("Product not found: " + id));
    }

    public Product saveProduct(Product product) {
        return productRepository.save(product);
    }

    public List<ProductVariant> getProductVariants(Long productId) {
        return productVariantRepository.findByProductId(productId);
    }

    public ProductVariant saveProductVariant(ProductVariant variant) {
        return productVariantRepository.save(variant);
    }

    public List<PriceList> getAllPriceLists() {
        return priceListRepository.findAll();
    }

    public List<CustomerTier> getAllCustomerTiers() {
        return customerTierRepository.findAll();
    }

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public Customer getCustomerById(Long id) {
        return customerRepository.findById(id).orElseThrow(() -> new RuntimeException("Customer not found: " + id));
    }

    public Customer saveCustomer(Customer customer) {
        return customerRepository.save(customer);
    }
}
