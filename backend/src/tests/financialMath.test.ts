import { describe, it, expect } from 'vitest';
import {
  calculateEMI,
  calculateMaxLoanPrincipal,
  calculateFOIR,
  calculateDTI,
  calculateAffordableAdditionalEmi,
  computeLoanMetrics,
  generateUnderwritingScenarios,
} from '../utils/financialMath.js';

describe('Financial Math & Banking Calculations', () => {
  it('calculates standard commercial EMI accurately', () => {
    // 10,00,000 at 10.5% for 60 months
    // Standard EMI formula: 1000000 * (0.105/12) * (1 + 0.105/12)^60 / ((1 + 0.105/12)^60 - 1)
    // Approx 21,493.90
    const emi = calculateEMI(1000000, 10.5, 60);
    expect(emi).toBeGreaterThan(21490);
    expect(emi).toBeLessThan(21500);
  });

  it('calculates inverse loan principal from affordable EMI', () => {
    const emi = 25000;
    const rate = 10.5;
    const tenure = 60;
    const principal = calculateMaxLoanPrincipal(emi, rate, tenure);
    expect(principal).toBeGreaterThan(1150000);
    expect(principal % 10000).toBe(0); // Should be rounded to nearest 10,000 for realistic loan ticket
  });

  it('calculates FOIR correctly', () => {
    // Income 1,00,000, existing EMIs 35,000 => FOIR 35%
    const foir = calculateFOIR(35000, 100000);
    expect(foir).toBe(35.0);

    // Overleveraged case
    const highFoir = calculateFOIR(75000, 100000);
    expect(highFoir).toBe(75.0);
  });

  it('calculates DTI ratio correctly', () => {
    // Annual Debt 3,60,000, Annual Income 12,00,000 => 30%
    const dti = calculateDTI(360000, 1200000);
    expect(dti).toBe(30.0);
  });

  it('calculates affordable additional EMI based on policy limit', () => {
    // Income 1,00,000, existing 20,000, max FOIR 50%
    // Permissible = 50,000 - 20,000 = 30,000
    const affordable = calculateAffordableAdditionalEmi(100000, 20000, 50);
    expect(affordable).toBe(30000);

    // If existing exceeds 50% => 0 affordable
    const overlimit = calculateAffordableAdditionalEmi(100000, 55000, 50);
    expect(overlimit).toBe(0);
  });

  it('generates 3 distinct underwriting scenarios (Conservative, Standard, Higher Affordability)', () => {
    const income = 150000;
    const existingDebt = 30000;
    const baseRate = 10.5;
    const tenure = 60;
    const requestedAmount = 2500000;

    const scenarios = generateUnderwritingScenarios(income, existingDebt, baseRate, tenure, requestedAmount);

    expect(scenarios.conservative).toBeDefined();
    expect(scenarios.standard).toBeDefined();
    expect(scenarios.aggressive).toBeDefined();

    expect(scenarios.conservative.foirPct).toBe(40);
    expect(scenarios.standard.foirPct).toBe(50);
    expect(scenarios.aggressive.foirPct).toBe(60);

    // Higher affordability allows higher principal or higher EMI
    expect(scenarios.aggressive.affordableEmi).toBeGreaterThan(scenarios.standard.affordableEmi);
    expect(scenarios.standard.affordableEmi).toBeGreaterThan(scenarios.conservative.affordableEmi);
  });
});
