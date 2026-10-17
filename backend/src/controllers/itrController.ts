import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { parseITRDocument, ParsedITR } from '../services/itrParser.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';

const prisma = new PrismaClient();

export const uploadItrMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export async function uploadITR(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const customerId = req.params.customerId as string;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer profile not found' });
      return;
    }

    let parsedItr: ParsedITR;

    if (req.file) {
      const textContent = req.file.buffer.toString('utf-8');
      parsedItr = parseITRDocument({
        rawText: textContent,
        assessmentYear: req.body.assessmentYear,
        financialYear: req.body.financialYear,
      });
    } else if (req.body.grossTotalIncome !== undefined) {
      parsedItr = parseITRDocument({
        jsonData: {
          assessmentYear: req.body.assessmentYear,
          financialYear: req.body.financialYear,
          formType: req.body.formType,
          acknowledgmentNumber: req.body.acknowledgmentNumber,
          grossTotalIncome: Number(req.body.grossTotalIncome),
          taxableIncome: Number(req.body.taxableIncome),
          salaryIncome: Number(req.body.salaryIncome || 0),
          businessProfessionIncome: Number(req.body.businessProfessionIncome || 0),
          otherIncome: Number(req.body.otherIncome || 0),
          chapterVIA_Deductions: Number(req.body.chapterVIA_Deductions || 0),
          totalTaxesPaid: Number(req.body.totalTaxesPaid || 0),
          refundOrPayable: Number(req.body.refundOrPayable || 0),
          panNumber: req.body.panNumber || customer.panNumber,
          isVerified: true,
        },
      });
    } else {
      res.status(400).json({ error: 'No ITR document file or financial data submitted' });
      return;
    }

    // Save ITR record
    const itr = await prisma.itrRecord.create({
      data: {
        customerId,
        assessmentYear: parsedItr.assessmentYear,
        financialYear: parsedItr.financialYear,
        formType: parsedItr.formType,
        filingDate: parsedItr.filingDate,
        filingStatus: parsedItr.filingStatus,
        acknowledgmentNumber: parsedItr.acknowledgmentNumber,
        grossTotalIncome: parsedItr.grossTotalIncome,
        taxableIncome: parsedItr.taxableIncome,
        salaryIncome: parsedItr.salaryIncome,
        businessProfessionIncome: parsedItr.businessProfessionIncome,
        otherIncome: parsedItr.otherIncome,
        chapterVIA_Deductions: parsedItr.chapterVIA_Deductions,
        totalTaxesPaid: parsedItr.totalTaxesPaid,
        refundOrPayable: parsedItr.refundOrPayable,
        panNumber: parsedItr.panNumber || customer.panNumber,
        isVerified: parsedItr.isVerified,
      },
    });

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'ITR_UPLOADED',
      entityType: 'ItrRecord',
      entityId: itr.id,
      details: `Ingested ${itr.formType} for ${itr.assessmentYear} (${itr.financialYear}). Gross Total Income: ₹${itr.grossTotalIncome.toLocaleString('en-IN')}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'ITR document parsed and verified successfully',
      itr,
    });
  } catch (error: any) {
    console.error('ITR upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to ingest ITR document' });
  }
}

export async function getCustomerITRs(req: Request, res: Response): Promise<void> {
  try {
    const customerId = req.params.customerId as string;

    const itrs = await prisma.itrRecord.findMany({
      where: { customerId },
      orderBy: { financialYear: 'desc' },
    });

    res.json({ itrs });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve ITR records' });
  }
}
