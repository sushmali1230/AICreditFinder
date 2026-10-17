import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logAudit } from '../services/auditService.js';
const prisma = new PrismaClient();
const customerSchema = z.object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Valid phone number required'),
    panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid Indian PAN format (e.g. ABCDE1234F)'),
    aadhaar: z.string().optional(),
    dateOfBirth: z.string(),
    employmentType: z.enum(['SALARIED', 'SELF_EMPLOYED_BUSINESS', 'SELF_EMPLOYED_PROFESSIONAL']),
    employerName: z.string().optional(),
    businessName: z.string().optional(),
    address: z.string().min(5, 'Address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().min(6, 'Valid 6-digit pincode required'),
    creditScore: z.number().int().min(300).max(900),
    requestedLoanAmount: z.number().positive('Loan amount must be positive'),
    requestedLoanTenureMonths: z.number().int().positive('Tenure must be positive'),
    requestedLoanPurpose: z.string().min(3, 'Loan purpose is required'),
});
export async function getCustomers(req, res) {
    try {
        const { search, employmentType, riskCategory } = req.query;
        const where = {};
        if (search) {
            where.OR = [
                { fullName: { contains: String(search) } },
                { email: { contains: String(search) } },
                { panNumber: { contains: String(search).toUpperCase() } },
                { phone: { contains: String(search) } },
            ];
        }
        if (employmentType && employmentType !== 'ALL') {
            where.employmentType = String(employmentType);
        }
        if (riskCategory && riskCategory !== 'ALL') {
            where.riskCategory = String(riskCategory);
        }
        const customers = await prisma.customer.findMany({
            where,
            include: {
                creditAssessments: {
                    orderBy: { version: 'desc' },
                    take: 1,
                },
                bankStatements: {
                    include: {
                        transactions: {
                            orderBy: { date: 'asc' },
                            take: 200,
                        },
                    },
                    orderBy: { uploadedAt: 'desc' },
                },
                itrRecords: {
                    orderBy: { financialYear: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ customers });
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Failed to retrieve customer profiles' });
    }
}
export async function getCustomerById(req, res) {
    try {
        const id = req.params.id;
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                bankStatements: {
                    include: {
                        transactions: {
                            orderBy: { date: 'asc' },
                            take: 200,
                        },
                    },
                    orderBy: { uploadedAt: 'desc' },
                },
                itrRecords: {
                    orderBy: { financialYear: 'desc' },
                },
                creditAssessments: {
                    orderBy: { version: 'desc' },
                    include: {
                        decisionMaker: {
                            select: { id: true, name: true, role: true },
                        },
                    },
                },
            },
        });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        res.json({ customer });
    }
    catch (error) {
        console.error('Error fetching customer details:', error);
        res.status(500).json({ error: 'Failed to retrieve customer details' });
    }
}
export async function createCustomer(req, res) {
    try {
        const validatedData = customerSchema.parse(req.body);
        const existing = await prisma.customer.findUnique({
            where: { panNumber: validatedData.panNumber.toUpperCase() },
        });
        if (existing) {
            res.status(400).json({ error: `Customer with PAN ${validatedData.panNumber} already exists in the system.` });
            return;
        }
        // Mask Aadhaar if provided (e.g. 1234 5678 9012 -> •••• •••• 9012)
        const rawAadhaar = validatedData.aadhaar ? validatedData.aadhaar.replace(/\s+/g, '') : '999999999999';
        const aadhaarMasked = `•••• •••• ${rawAadhaar.slice(-4)}`;
        const customer = await prisma.customer.create({
            data: {
                fullName: validatedData.fullName,
                email: validatedData.email.toLowerCase(),
                phone: validatedData.phone,
                panNumber: validatedData.panNumber.toUpperCase(),
                aadhaarMasked,
                dateOfBirth: validatedData.dateOfBirth,
                employmentType: validatedData.employmentType,
                employerName: validatedData.employerName || null,
                businessName: validatedData.businessName || null,
                address: validatedData.address,
                city: validatedData.city,
                state: validatedData.state,
                pincode: validatedData.pincode,
                creditScore: validatedData.creditScore,
                requestedLoanAmount: validatedData.requestedLoanAmount,
                requestedLoanTenureMonths: validatedData.requestedLoanTenureMonths,
                requestedLoanPurpose: validatedData.requestedLoanPurpose,
                riskCategory: validatedData.creditScore >= 750 ? 'LOW_RISK' : validatedData.creditScore >= 650 ? 'MODERATE_RISK' : 'HIGH_RISK',
            },
        });
        await logAudit({
            userId: req.user?.id,
            userName: req.user?.name,
            userRole: req.user?.role,
            action: 'CUSTOMER_CREATED',
            entityType: 'Customer',
            entityId: customer.id,
            details: `Created customer profile for ${customer.fullName} (PAN: ${customer.panNumber}) requesting ₹${customer.requestedLoanAmount.toLocaleString('en-IN')}`,
            ipAddress: req.ip,
        });
        res.status(201).json({ customer });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues.map((i) => i.message).join(', ') });
            return;
        }
        console.error('Customer creation error:', error);
        res.status(500).json({ error: 'Failed to create customer profile' });
    }
}
export async function updateCustomer(req, res) {
    try {
        const id = req.params.id;
        const updateData = req.body;
        const customer = await prisma.customer.update({
            where: { id },
            data: {
                fullName: updateData.fullName,
                phone: updateData.phone,
                email: updateData.email,
                employmentType: updateData.employmentType,
                employerName: updateData.employerName,
                businessName: updateData.businessName,
                address: updateData.address,
                city: updateData.city,
                state: updateData.state,
                pincode: updateData.pincode,
                creditScore: updateData.creditScore ? Number(updateData.creditScore) : undefined,
                requestedLoanAmount: updateData.requestedLoanAmount ? Number(updateData.requestedLoanAmount) : undefined,
                requestedLoanTenureMonths: updateData.requestedLoanTenureMonths ? Number(updateData.requestedLoanTenureMonths) : undefined,
                requestedLoanPurpose: updateData.requestedLoanPurpose,
            },
        });
        await logAudit({
            userId: req.user?.id,
            userName: req.user?.name,
            userRole: req.user?.role,
            action: 'CUSTOMER_UPDATED',
            entityType: 'Customer',
            entityId: customer.id,
            details: `Updated parameters for ${customer.fullName}`,
            ipAddress: req.ip,
        });
        res.json({ customer });
    }
    catch (error) {
        console.error('Customer update error:', error);
        res.status(500).json({ error: 'Failed to update customer profile' });
    }
}
