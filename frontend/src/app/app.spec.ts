import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { App } from './app';

describe('App', () => {
  it('should create the executive shell app', () => {
    const app = new App();
    expect(app).toBeTruthy();
  });
});
