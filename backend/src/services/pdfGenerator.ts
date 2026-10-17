import PDFDocument from 'pdfkit';
import { CreditAssessmentResult } from './creditEngine.js';
import { StatementAnalysisResult } from './statementParser.js';
import { ParsedITR } from './itrParser.js';

export interface CAMDocumentData {
  assessmentId: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    panNumber: string;
    employmentType: string;
    employerName?: string | null;
    businessName?: string | null;
    city: string;
    state: string;
    creditScore: number;
    requestedLoanAmount: number;
    requestedLoanTenureMonths: number;
    requestedLoanPurpose: string;
  };
  assessment: CreditAssessmentResult;
  statementAnalysis?: StatementAnalysisResult | null;
  itrRecords?: ParsedITR[];
  approverNotes?: string | null;
  analystNotes?: string | null;
  status: string;
  decisionBy?: string | null;
  decisionDate?: Date | null;
  approvedAmount?: number | null;
}

/**
 * Generate a complete, institutional Credit Appraisal Memorandum (CAM) PDF
 */
export function generateCreditAppraisalPDF(data: CAMDocumentData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `CAM-${data.customer.fullName.replace(/\s+/g, '_')}`,
          Author: 'Apex Commercial Bank - Credit Risk & Underwriting',
          Subject: 'Credit Appraisal Memorandum',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#0f2942';   // Navy
      const secondaryColor = '#2563eb'; // Blue
      const successColor = '#059669';   // Emerald
      const textDark = '#1e293b';       // Slate 800
      const textMuted = '#64748b';      // Slate 500
      const bgLight = '#f8fafc';        // Slate 50
      const borderColor = '#cbd5e1';    // Slate 300

      // --- HEADER ---
      doc
        .rect(40, 35, 515, 60)
        .fill(primaryColor);

      doc
        .fillColor('#ffffff')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('APEX COMMERCIAL BANK', 55, 47);

      doc
        .fontSize(9)
        .font('Helvetica')
        .text('RETAIL & COMMERCIAL LENDING DIVISION | RISK & UNDERWRITING', 55, 67);

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('CREDIT APPRAISAL MEMORANDUM (CAM)', 55, 82);

      // Metadata block
      let y = 105;
      doc
        .fillColor(textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text(`CAM Ref: CAM-2024-${data.assessmentId.slice(0, 8).toUpperCase()}`, 40, y)
        .text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 420, y);

      y += 18;

      // --- SECTION 1: APPLICANT PROFILE ---
      drawSectionHeader(doc, '1. BORROWER PROFILE & FACILITY REQUEST', y, primaryColor);
      y += 24;

      doc
        .rect(40, y, 515, 68)
        .fillAndStroke(bgLight, borderColor);

      doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold');
      doc.text('Applicant Name:', 50, y + 8);
      doc.text('PAN Number:', 230, y + 8);
      doc.text('Bureau Score (CIBIL):', 400, y + 8);

      doc.font('Helvetica').fillColor(textDark);
      doc.text(data.customer.fullName, 50, y + 20);
      doc.text(data.customer.panNumber, 230, y + 20);
      doc.font('Helvetica-Bold').fillColor(data.customer.creditScore >= 750 ? successColor : '#d97706');
      doc.text(`${data.customer.creditScore} / 900`, 400, y + 20);

      doc.font('Helvetica-Bold').fillColor(textDark);
      doc.text('Employment / Sector:', 50, y + 36);
      doc.text('Requested Facility:', 230, y + 36);
      doc.text('Requested Tenure:', 400, y + 36);

      doc.font('Helvetica').fillColor(textDark);
      const empDetails = data.customer.employerName || data.customer.businessName || data.customer.employmentType.replace(/_/g, ' ');
      doc.text(`${data.customer.employmentType.replace(/_/g, ' ')} (${empDetails})`, 50, y + 48, { width: 170 });
      doc.text(`₹${data.customer.requestedLoanAmount.toLocaleString('en-IN')} (${data.customer.requestedLoanPurpose})`, 230, y + 48, { width: 160 });
      doc.text(`${data.customer.requestedLoanTenureMonths} Months`, 400, y + 48);

      y += 80;

      // --- SECTION 2: 2-YEAR ITR ANALYSIS ---
      drawSectionHeader(doc, '2. MULTI-YEAR ITR CROSS-EXAMINATION & INCOME VERIFICATION', y, primaryColor);
      y += 24;

      const itrs = data.itrRecords || [];
      const has2Years = itrs.length >= 2;

      doc.rect(40, y, 515, 65).fillAndStroke(bgLight, borderColor);

      doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold');
      doc.text('Assessment Year', 50, y + 8);
      doc.text('Gross Total Income (GTI)', 170, y + 8);
      doc.text('Taxable Income', 290, y + 8);
      doc.text('Taxes Paid (TDS/Advance)', 410, y + 8);

      doc.font('Helvetica');
      let rowY = y + 22;
      for (const itr of itrs.slice(0, 2)) {
        doc.text(`${itr.assessmentYear} (${itr.financialYear})`, 50, rowY);
        doc.text(`₹${itr.grossTotalIncome.toLocaleString('en-IN')}`, 170, rowY);
        doc.text(`₹${itr.taxableIncome.toLocaleString('en-IN')}`, 290, rowY);
        doc.text(`₹${itr.totalTaxesPaid.toLocaleString('en-IN')}`, 410, rowY);
        rowY += 14;
      }

      if (itrs.length === 0) {
        doc.text('No formal ITR uploaded; income verified via alternative payroll/banking streams.', 50, rowY);
      }

      y += 75;

      // Trend note
      if (data.assessment.crossVerification?.incomeTrend) {
        const trend = data.assessment.crossVerification.incomeTrend;
        doc
          .fillColor(trend.growthPercentage >= 0 ? successColor : '#dc2626')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(`ITR Income Growth Trend: ${trend.narrative}`, 45, y);
        y += 16;
      }

      // --- SECTION 3: BANKING STATEMENT & CONDUCT ---
      drawSectionHeader(doc, '3. BANKING CASH FLOW & ACCOUNT CONDUCT', y, primaryColor);
      y += 24;

      const stmt = data.statementAnalysis;
      doc.rect(40, y, 515, 52).fillAndStroke(bgLight, borderColor);

      doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold');
      doc.text('Avg Monthly Balance (AMB):', 50, y + 8);
      doc.text('Monthly Payroll/Credits:', 180, y + 8);
      doc.text('Existing Debts/EMIs:', 310, y + 8);
      doc.text('Inward Bounces/Returns:', 430, y + 8);

      doc.font('Helvetica');
      doc.text(`₹${(stmt?.averageMonthlyBalance || 0).toLocaleString('en-IN')}`, 50, y + 22);
      doc.text(`₹${(stmt?.monthlySalaryDetected || data.assessment.verifiedMonthlyIncome).toLocaleString('en-IN')}`, 180, y + 22);
      doc.text(`₹${(stmt?.recurringEmiDetected || data.assessment.existingDebtObligations).toLocaleString('en-IN')}`, 310, y + 22);

      const bounceCount = stmt?.bounceCount || 0;
      doc.font('Helvetica-Bold').fillColor(bounceCount === 0 ? successColor : '#dc2626');
      doc.text(`${bounceCount} Dishonor(s)`, 430, y + 22);

      y += 62;

      // --- SECTION 4: UNDERWRITING METRICS & SCENARIOS ---
      drawSectionHeader(doc, '4. RISK GRADE & CREDIT CAPACITY SCENARIOS', y, primaryColor);
      y += 24;

      doc.rect(40, y, 515, 85).fillAndStroke('#ffffff', borderColor);

      // Header row
      doc.rect(40, y, 515, 20).fill('#e2e8f0');
      doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold');
      doc.text('Scenario', 50, y + 6);
      doc.text('FOIR Cap', 150, y + 6);
      doc.text('Max Eligible Principal', 220, y + 6);
      doc.text('Rate', 340, y + 6);
      doc.text('Tenure', 380, y + 6);
      doc.text('Monthly EMI', 450, y + 6);

      const scenarios = [
        data.assessment.conservativeScenario,
        data.assessment.standardScenario,
        data.assessment.aggressiveScenario,
      ];

      let scY = y + 24;
      for (const sc of scenarios) {
        if (!sc) continue;
        doc.font('Helvetica-Bold').fillColor(textDark);
        doc.text(sc.scenarioName, 50, scY);
        doc.font('Helvetica');
        doc.text(`${sc.foirPct}%`, 150, scY);
        doc.text(`₹${sc.principal.toLocaleString('en-IN')}`, 220, scY);
        doc.text(`${sc.annualInterestRate}%`, 340, scY);
        doc.text(`${sc.tenureMonths}m`, 380, scY);
        doc.font('Helvetica-Bold');
        doc.text(`₹${sc.monthlyEmi.toLocaleString('en-IN')}`, 450, scY);
        scY += 18;
      }

      y += 95;

      // --- SECTION 5: RECOMMENDATION & SIGN-OFF ---
      drawSectionHeader(doc, '5. UNDERWRITING REASONING & COMMITTEE SANCTION', y, primaryColor);
      y += 24;

      doc.rect(40, y, 515, 50).fillAndStroke(bgLight, borderColor);
      doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold').text('Recommendation Reasoning:', 50, y + 6);
      doc.font('Helvetica').fontSize(7.5).fillColor(textDark);
      doc.text(data.assessment.recommendationReasoning, 50, y + 18, { width: 495, lineGap: 2 });

      y += 60;

      // Decision Box
      const isApproved = data.status === 'APPROVED';
      const isRejected = data.status === 'REJECTED';
      const boxColor = isApproved ? '#ecfdf5' : isRejected ? '#fef2f2' : '#f8fafc';
      const borderBox = isApproved ? '#10b981' : isRejected ? '#ef4444' : borderColor;

      doc.rect(40, y, 515, 55).fillAndStroke(boxColor, borderBox);

      doc.fillColor(isApproved ? '#047857' : isRejected ? '#b91c1c' : primaryColor).fontSize(10).font('Helvetica-Bold');
      doc.text(`SANCTION STATUS: ${data.status.replace(/_/g, ' ')}`, 50, y + 8);

      doc.fontSize(8).font('Helvetica').fillColor(textDark);
      if (isApproved) {
        doc.text(`Sanctioned Amount: ₹${(data.approvedAmount || data.assessment.calculatedMaxLoanPrincipal).toLocaleString('en-IN')}`, 50, y + 24);
        doc.text(`Approved By: ${data.decisionBy || 'Authorized Credit Approver'}`, 240, y + 24);
        doc.text(`Date: ${data.decisionDate ? new Date(data.decisionDate).toLocaleDateString() : new Date().toLocaleDateString()}`, 400, y + 24);
      } else {
        doc.text(`Decision Authority: ${data.decisionBy || 'Underwriting Officer'}`, 50, y + 24);
        doc.text(`Risk Grade: ${data.assessment.riskGrade} (Composite Score: ${data.assessment.riskScore}/100)`, 240, y + 24);
      }

      if (data.approverNotes) {
        doc.text(`Approver Notes/Stipulations: ${data.approverNotes}`, 50, y + 38, { width: 495 });
      }

      y += 65;

      // Signature lines
      doc.rect(40, y, 245, 45).stroke(borderColor);
      doc.rect(310, y, 245, 45).stroke(borderColor);

      doc.fontSize(7).font('Helvetica-Bold').fillColor(textMuted);
      doc.text('CREDIT RISK ANALYST SIGN-OFF', 50, y + 6);
      doc.text('CHIEF UNDERWRITING OFFICER / BRANCH APPROVER', 320, y + 6);

      doc.font('Helvetica').fontSize(7);
      doc.text(`Prepared by: ${data.analystNotes ? 'Verified Analyst' : 'Automated Appraisal Engine'}`, 50, y + 28);
      doc.text(`Authorized Signatory: ${data.decisionBy || 'Pending Signature'}`, 320, y + 28);

      // Footer
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor(textMuted)
        .text('Confidential - For Internal Bank Credit Committee & Audit Use Only | Generated by Apex Bank AI Underwriting Suite', 40, 800, { align: 'center', width: 515 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function drawSectionHeader(doc: PDFKit.PDFDocument, title: string, y: number, color: string) {
  doc
    .rect(40, y, 515, 18)
    .fill(color);

  doc
    .fillColor('#ffffff')
    .fontSize(8.5)
    .font('Helvetica-Bold')
    .text(title, 48, y + 5);
}
