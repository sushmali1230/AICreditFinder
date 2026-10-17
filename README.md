# Apex Commercial Bank - Credit Risk & Loan Recommendation System

An enterprise-grade, modern React and Node.js platform for commercial bank underwriter teams. Designed for automated ingestion and audit of bank statements (CSV, Excel, PDF), 2-year Indian Income Tax Return (ITR) cross-verification, discrepancy detection, and deterministic credit recommendation modeling.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │    Apex Bank Underwriting Frontend (Vite)     │
                      │  React 19 + TypeScript + Tailwind CSS v4     │
                      │  Recharts + Lucide + Glassmorphism Theme     │
                      └──────────────────────┬───────────────────────┘
                                             │ HTTP / REST API
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │    Express & Node.js Backend Engine (ESM)    │
                      │   - JWT Auth & Role-Based Access Control     │
                      │   - Multer File Ingestion (CSV / XLSX / PDF) │
                      │   - PDFKit CAM Report Generator              │
                      │   - Immutable Regulatory Audit Logger        │
                      └──────┬────────────────┬───────────────┬──────┘
                             │                │               │
                             ▼                ▼               ▼
                 ┌────────────────┐  ┌────────────────┐  ┌───────────────┐
                 │Statement Parser│  │   ITR Parser   │  │ Credit Engine │
                 │- Categorizer   │  │- GTI / Taxable │  │- Exact Decimal│
                 │- Salary / EMI  │  │- PGBP / 80C    │  │- FOIR / DTI   │
                 │- Inward Bounces│  │- Form 1/2/3/4  │  │- 3 Scenarios  │
                 └────────────────┘  └────────────────┘  └───────────────┘
                             │                │               │
                             └────────┬───────┴───────────────┘
                                      ▼
                      ┌──────────────────────────────────────────────┐
                      │       Discrepancy Detection & Audit          │
                      │  - Bank vs ITR Turnover Variance (> 20%)     │
                      │  - Multi-Year YoY Growth Trend Analysis      │
                      │  - Cheque / NACH Debit Dishonor Flags        │
                      │  - PAN Identity Matching & Missing Doc Flags │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │       Prisma ORM Persistence Layer           │
                      │  - Local Zero-Friction: SQLite (`dev.db`)    │
                      │  - Production Enterprise: PostgreSQL 16      │
                      └──────────────────────────────────────────────┘
```

---

## Key Features

1. **Borrower KYC & Customer Management**:
   - Register salaried executives, SME business owners, and self-employed professionals.
   - Indian PAN verification format (`[A-Z]{5}[0-9]{4}[A-Z]{1}`) and Aadhaar masking (`•••• •••• 1234`).
   - CIBIL Bureau score tracking (300–900).

2. **Bank Statement Cash Flow & Conduct Parser**:
   - Ingests **CSV**, **Excel (.xlsx / .xls)**, and **PDF** bank statements.
   - Automatic narration pattern classification:
     - Salary deposits (`CMS/SAL`, `NEFT/SAL`, corporate payroll)
     - Business turnover receipts (`UPI/QR`, `RTGS`, merchant settlement)
     - Existing loan EMIs (`ACH/NACH`, `ECS`, lender mandates)
     - Inward clearing bounces / penalties (`CHQ RET`, `NACH RET`, dishonor charges)
     - Rent, utilities, and high-value cash transactions.
   - Interactive Recharts visualizations: Inflow vs Outflow velocity bar charts and month-end closing balance trendline.

3. **Multi-Year ITR Cross-Examination Engine**:
   - Compares consecutive 2-year tax filings (e.g. FY 2023-24 vs FY 2022-23).
   - Extracts Gross Total Income (GTI), Net Taxable Income, Business Profits (PGBP), Salary (u/s 17), Chapter VI-A deductions, and Taxes Paid (TDS/Advance Tax).
   - Computes Year-over-Year (YoY) income expansion or contraction percentages.

4. **Automated Discrepancy & Red Flag Detection**:
   - **Bank vs ITR Turnover Variance**: Flags when declared ITR income is not corroborated by bank inflows, or when turnover exceeds declared taxable revenues.
   - **Dishonor Events**: Detects inward clearing bounces and ECS/NACH return penalties.
   - **Identity Checks**: Cross-checks customer profile PAN with ITR acknowledgment PAN.
   - **Missing Information**: Flags missing prior-year tax returns or incomplete statement history.

5. **Explainable Deterministic Credit Engine**:
   - **Verified Monthly Income**: Prudent synthesis of bank payroll deposits and ITR income.
   - **Existing Debt Obligations**: Aggregated from recurring bank statement EMI debits.
   - **FOIR & DTI Ratios**: Exact decimal arithmetic using `decimal.js` (no floating-point rounding errors).
   - **Affordable Additional EMI**: Permissible monthly debt service headroom under policy guidelines.
   - **Three Multi-Scenario Projections**:
     - **Conservative Scenario**: Strict 40% FOIR cap with +50 bps rate buffer.
     - **Standard Scenario**: 50% FOIR retail benchmark at standard rate.
     - **Higher Affordability Scenario**: 60% FOIR limit with extended tenure.
   - Clearly labeled as estimates with detailed transparency of calculation assumptions.

6. **Role-Based Access Control (RBAC)**:
   - **Credit Analyst**: Creates profiles, uploads documentation, runs assessments, adds underwriting notes.
   - **Approver / CUO**: Reviews full file, grants formal loan sanctions, rejects applications, or returns with stipulations.
   - **Risk Operations Admin**: Configures institutional lending policies (FOIR limits, base interest rates, CIBIL thresholds) and inspects regulatory audit logs.

7. **Downloadable Credit Appraisal Memorandum (CAM) PDF**:
   - Institutional PDF generated via `pdfkit` containing bank headers, KYC summary, 2-year ITR comparison, banking conduct, scenario matrix, and underwriter sign-off sheet.

8. **Human Underwriting Compliance**:
   - Strictly enforces that loans cannot be sanctioned automatically by AI; all final underwriting determinations require human sign-off by accredited banking officers.

---

## Pre-Seeded Realistic Indian Banking Personas

| Persona | Employment | CIBIL | 2-Yr ITR Profile | Statement Conduct | Underwriting Result |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **Rajesh Sharma** | Salaried VP at Infosys | 785 | FY24: ₹24.8L, FY23: ₹21.5L (+15.3% YoY) | ₹1.85L salary on 1st, 0 bounces, AMB ₹1.45L | **Prime Grade A** • Approved ₹35,00,000 at 10.0% |
| **Priya Patel** | Business Owner (Apex Healthcare) | 735 | FY24: ₹16.4L, FY23: ₹13.5L (+21.5% YoY) | ₹3.8L/mo commercial inflows, 0 bounces, AMB ₹2.2L | **Good Grade B** • Pending Approval for ₹25,00,000 |
| **Amit Verma** | Self-Employed Cloud Consultant | 685 | FY24: ₹11.2L, FY23: ₹10.9L (ITR-4) | Fluctuating inflows, 1 delayed client bounce | **Borderline Grade C** • Reassessment Requested |
| **Neha Gupta** | Sales Executive | 618 | FY24: ₹7.8L, Prior Year Missing | 3 active EMIs (67.7% FOIR!), 3 NACH bounces | **High Risk Grade D** • Rejected (Overleveraged) |

---

## Quick Start & Local Execution

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
# Clone or navigate to the repository
cd AICreditFinder

# Install root dependencies
npm install

# Setup backend dependencies & Prisma
cd backend
npm install
npx prisma db push
npm run seed

# Setup frontend dependencies
cd ../frontend
npm install
```

### Running the Application
From the root workspace directory, run:
```bash
npm run dev
```
This concurrently starts:
- **Backend API**: `http://localhost:5001`
- **Frontend Dashboard**: `http://localhost:3000`

### Pre-Configured Test Credentials
Use the instant **Role Switcher** in the top navigation bar, or log in with:
- **Analyst**: `analyst@apexbank.com` / `password123`
- **Approver (CUO)**: `approver@apexbank.com` / `password123`
- **Admin**: `admin@apexbank.com` / `password123`

---

## Running Unit Tests
```bash
cd backend
npm run test
```
Executes Vitest test suites covering:
- Standard commercial EMI calculations
- Inverse principal calculations from affordable EMI
- FOIR and DTI ratio precision
- Multi-scenario underwriting modeling
- Income reconciliation and overleverage capping

---

## Production Deployment with PostgreSQL
To connect to an external PostgreSQL instance:
1. Start PostgreSQL using the provided Docker Compose file:
   ```bash
   docker-compose up -d
   ```
2. Update `backend/.env` with your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/aicreditfinder?schema=public"
   ```
3. Push schema to PostgreSQL:
   ```bash
   cd backend
   npx prisma db push --schema=prisma/schema.postgresql.prisma
   npm run seed
   ```
