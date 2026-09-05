import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Product, Category, Customer, CustomerTier } from '../models/dealflow.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  constructor(private api: ApiService) {}

  getProducts(): Observable<Product[]> {
    return this.api.get<Product[]>('catalog/products');
  }

  getCategories(): Observable<Category[]> {
    return this.api.get<Category[]>('catalog/categories');
  }

  getCustomers(): Observable<Customer[]> {
    return this.api.get<Customer[]>('catalog/customers');
  }

  getCustomerTiers(): Observable<CustomerTier[]> {
    return this.api.get<CustomerTier[]>('catalog/customer-tiers');
  }
}
