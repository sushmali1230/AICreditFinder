import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { login, getCurrentUser } from './controllers/authController.js';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, } from './controllers/customerController.js';
import { uploadStatement, uploadStatementMulter, getStatementDetails, } from './controllers/statementController.js';
import { uploadITR, uploadItrMulter, getCustomerITRs } from './controllers/itrController.js';
import { runAssessmentForCustomer, recordDecision, downloadCAMReport, } from './controllers/assessmentController.js';
import { getLendingPolicies, updatePolicy } from './controllers/policyController.js';
import { getAuditLogs } from './controllers/auditController.js';
import { authenticateJWT, requireRole } from './middleware/auth.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;
// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
// Health Check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'HEALTHY',
        service: 'Apex Bank Credit Analysis & Loan Recommendation Engine',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});
// Auth Routes
app.post('/api/auth/login', login);
app.get('/api/auth/me', authenticateJWT, getCurrentUser);
// Customer Routes
app.get('/api/customers', getCustomers);
app.get('/api/customers/:id', getCustomerById);
app.post('/api/customers', authenticateJWT, createCustomer);
app.put('/api/customers/:id', authenticateJWT, updateCustomer);
// Bank Statement Routes
app.post('/api/customers/:customerId/statements/upload', authenticateJWT, uploadStatementMulter.single('file'), uploadStatement);
app.get('/api/statements/:id', getStatementDetails);
// ITR Routes
app.post('/api/customers/:customerId/itr/upload', authenticateJWT, uploadItrMulter.single('file'), uploadITR);
app.get('/api/customers/:customerId/itr', getCustomerITRs);
// Assessment & Underwriting Routes
app.post('/api/customers/:customerId/assessments/run', authenticateJWT, runAssessmentForCustomer);
app.post('/api/assessments/:id/decision', authenticateJWT, recordDecision);
app.get('/api/assessments/:id/pdf', downloadCAMReport);
// Policy Configuration Routes
app.get('/api/policies', getLendingPolicies);
app.put('/api/policies/:id', authenticateJWT, requireRole(['ADMIN']), updatePolicy);
// Audit Trail Routes
app.get('/api/audit-logs', authenticateJWT, getAuditLogs);
// Global Error Handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled API Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});
// Start Server
app.listen(PORT, () => {
    console.log(`🏦 Bank Credit Analysis & Loan Recommendation Server running on http://localhost:${PORT}`);
    console.log(`📋 API Health: http://localhost:${PORT}/api/health`);
});
