import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Product,
  ProductRequest,
  Category,
  CategoryRequest,
  PriceList,
  PriceListRequest,
  Customer,
  CustomerRequest,
  CustomerTier,
  CustomerTierRequest,
  ApprovalChainRule,
  ApprovalChainRequest
} from '../models/dealflow.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  constructor(private api: ApiService) {}

  // ====================
  // PRODUCTS
  // ====================
  getProducts(): Observable<Product[]> {
    return this.api.get<Product[]>('catalog/products');
  }

  getAllProductsAdmin(): Observable<Product[]> {
    return this.api.get<Product[]>('catalog/products/all');
  }

  getProductById(id: number): Observable<Product> {
    return this.api.get<Product>(`catalog/products/${id}`);
  }

  createProduct(request: ProductRequest): Observable<Product> {
    return this.api.post<Product>('catalog/products', request);
  }

  updateProduct(id: number, request: ProductRequest): Observable<Product> {
    return this.api.put<Product>(`catalog/products/${id}`, request);
  }

  deleteProduct(id: number): Observable<void> {
    return this.api.delete<void>(`catalog/products/${id}`);
  }

  // ====================
  // CATEGORIES
  // ====================
  getCategories(): Observable<Category[]> {
    return this.api.get<Category[]>('catalog/categories');
  }

  getCategoryById(id: number): Observable<Category> {
    return this.api.get<Category>(`catalog/categories/${id}`);
  }

  createCategory(request: CategoryRequest): Observable<Category> {
    return this.api.post<Category>('catalog/categories', request);
  }

  updateCategory(id: number, request: CategoryRequest): Observable<Category> {
    return this.api.put<Category>(`catalog/categories/${id}`, request);
  }

  deleteCategory(id: number): Observable<void> {
    return this.api.delete<void>(`catalog/categories/${id}`);
  }

  // ====================
  // PRICE LISTS
  // ====================
  getPriceLists(): Observable<PriceList[]> {
    return this.api.get<PriceList[]>('catalog/price-lists');
  }

  getPriceListById(id: number): Observable<PriceList> {
    return this.api.get<PriceList>(`catalog/price-lists/${id}`);
  }

  createPriceList(request: PriceListRequest): Observable<PriceList> {
    return this.api.post<PriceList>('catalog/price-lists', request);
  }

  updatePriceList(id: number, request: PriceListRequest): Observable<PriceList> {
    return this.api.put<PriceList>(`catalog/price-lists/${id}`, request);
  }

  deletePriceList(id: number): Observable<void> {
    return this.api.delete<void>(`catalog/price-lists/${id}`);
  }

  // ====================
  // CUSTOMER MASTER DATA
  // ====================
  getCustomers(): Observable<Customer[]> {
    return this.api.get<Customer[]>('catalog/customers');
  }

  getCustomerById(id: number): Observable<Customer> {
    return this.api.get<Customer>(`catalog/customers/${id}`);
  }

  createCustomer(request: CustomerRequest): Observable<Customer> {
    return this.api.post<Customer>('catalog/customers', request);
  }

  updateCustomer(id: number, request: CustomerRequest): Observable<Customer> {
    return this.api.put<Customer>(`catalog/customers/${id}`, request);
  }

  deleteCustomer(id: number): Observable<void> {
    return this.api.delete<void>(`catalog/customers/${id}`);
  }

  // ====================
  // CUSTOMER TIERS (DISCOUNT TIERS)
  // ====================
  getCustomerTiers(): Observable<CustomerTier[]> {
    return this.api.get<CustomerTier[]>('catalog/customer-tiers');
  }

  getCustomerTierById(id: number): Observable<CustomerTier> {
    return this.api.get<CustomerTier>(`catalog/customer-tiers/${id}`);
  }

  createCustomerTier(request: CustomerTierRequest): Observable<CustomerTier> {
    return this.api.post<CustomerTier>('catalog/customer-tiers', request);
  }

  updateCustomerTier(id: number, request: CustomerTierRequest): Observable<CustomerTier> {
    return this.api.put<CustomerTier>(`catalog/customer-tiers/${id}`, request);
  }

  deleteCustomerTier(id: number): Observable<void> {
    return this.api.delete<void>(`catalog/customer-tiers/${id}`);
  }

  // ====================
  // APPROVAL CHAINS
  // ====================
  getApprovalChains(): Observable<ApprovalChainRule[]> {
    return this.api.get<ApprovalChainRule[]>('catalog/approval-chains');
  }

  getApprovalChainById(id: number): Observable<ApprovalChainRule> {
    return this.api.get<ApprovalChainRule>(`catalog/approval-chains/${id}`);
  }

  createApprovalChain(request: ApprovalChainRequest): Observable<ApprovalChainRule> {
    return this.api.post<ApprovalChainRule>('catalog/approval-chains', request);
  }

  updateApprovalChain(id: number, request: ApprovalChainRequest): Observable<ApprovalChainRule> {
    return this.api.put<ApprovalChainRule>(`catalog/approval-chains/${id}`, request);
  }

  deleteApprovalChain(id: number): Observable<void> {
    return this.api.delete<void>(`catalog/approval-chains/${id}`);
  }
}


