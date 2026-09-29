// ============================================================
// AI GOVERNANCE — PDF Export Serializer
// ============================================================
//
// Generates a real PDF governance report from the canonical export object.
// Uses jsPDF with autotable plugin for structured tables.
//

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CanonicalExportObject } from './canonical-export';

// ---- PDF Generator ----

export function generatePDFReport(exportData: CanonicalExportObject): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = margin;

  // Helper functions
  const addTitle = (title: string, level: 1 | 2 | 3 = 1) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = margin;
    }
    
    if (level === 1) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
    } else if (level === 2) {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
    }
    
    doc.text(title, margin, yPos);
    yPos += level === 1 ? 10 : 7;
  };

  const addText = (text: string, fontSize: number = 10) => {
    if (yPos > 280) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    doc.text(lines, margin, yPos);
    yPos += lines.length * 5;
  };

  const addKeyValue = (key: string, value: string | number) => {
    if (yPos > 280) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${key}:`, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), margin + 60, yPos);
    yPos += 5;
  };

  const addPageNumber = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  };

  // ---- COVER PAGE ----
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('AI DATA CATALOG BASELINE AUDIT', pageWidth / 2, 50, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text('AI GOVERNANCE REPORT', pageWidth / 2, 65, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${exportData.exportTimestamp}`, pageWidth / 2, 85, { align: 'center' });
  doc.text(`Application Mode: ${exportData.applicationMode}`, pageWidth / 2, 92, { align: 'center' });
  doc.text(`Report Version: ${exportData.exportVersion}`, pageWidth / 2, 99, { align: 'center' });

  doc.addPage();
  yPos = margin;

  // ---- 1. EXECUTIVE SUMMARY ----
  addTitle('1. Executive Summary', 1);
  addKeyValue('Export Timestamp', exportData.executiveSummary.exportTimestamp);
  addKeyValue('Application Mode', exportData.executiveSummary.applicationMode);
  addKeyValue('Export Version', exportData.executiveSummary.exportVersion);
  yPos += 5;
  
  addTitle('Summary Statistics', 3);
  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Count']],
    body: [
      ['Total AI Use Cases', String(exportData.executiveSummary.totalAIUseCases)],
      ['Total Training Datasets', String(exportData.executiveSummary.totalTrainingDatasets)],
      ['Total Models', String(exportData.executiveSummary.totalModels)],
      ['Total RAG Resources', String(exportData.executiveSummary.totalRAGResources)],
      ['Total Drift Assessments', String(exportData.executiveSummary.totalDriftAssessments)],
      ['Total Sensitive Data Assessments', String(exportData.executiveSummary.totalSensitiveDataAssessments)],
      ['Total Governance Assessments', String(exportData.executiveSummary.totalGovernanceAssessments)],
      ['Total Evidence Records', String(exportData.executiveSummary.totalEvidenceRecords)],
      ['Total Audit Records', String(exportData.executiveSummary.totalAuditRecords)],
      ['Total Human Reviews', String(exportData.executiveSummary.totalHumanReviews)],
      ['Total Certifications', String(exportData.executiveSummary.totalCertifications)],
    ],
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185] },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  doc.addPage();
  yPos = margin;

  // ---- 2. AI USE CASES ----
  addTitle('2. AI Use Cases', 1);
  if (exportData.aiUseCases.length === 0) {
    addText('No records available for this section.');
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Name', 'Purpose', 'Status', 'Domain']],
      body: exportData.aiUseCases.map(uc => [
        uc.id.slice(0, 8),
        uc.name.slice(0, 30),
        uc.purpose.slice(0, 30),
        uc.status,
        uc.businessDomain.slice(0, 20),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellWidth: 'auto' },
      headStyles: { fillColor: [41, 128, 185] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ---- 3. TRAINING DATA GOVERNANCE ----
  if (yPos > 200) { doc.addPage(); yPos = margin; }
  addTitle('3. Training Data Governance', 1);
  if (exportData.trainingData.length === 0) {
    addText('No records available for this section.');
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Dataset', 'Purpose', 'Lineage', 'Approval']],
      body: exportData.trainingData.map(td => [
        td.id.slice(0, 8),
        td.datasetAssetId.slice(0, 8),
        td.purpose.slice(0, 25),
        td.lineageStatus,
        td.approvalStatus,
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ---- 4. MODEL GOVERNANCE ----
  if (yPos > 200) { doc.addPage(); yPos = margin; }
  addTitle('4. Model Governance', 1);
  if (exportData.models.length === 0) {
    addText('No records available for this section.');
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [['Asset ID', 'Name', 'Version', 'Type', 'Status']],
      body: exportData.models.map(m => [
        m.assetId.slice(0, 8),
        m.modelName.slice(0, 25),
        m.modelVersion,
        m.modelType.slice(0, 15),
        m.governanceStatus,
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ---- 5. RAG GOVERNANCE ----
  if (yPos > 200) { doc.addPage(); yPos = margin; }
  addTitle('5. RAG Governance', 1);
  if (exportData.ragResources.length === 0) {
    addText('No records available for this section.');
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [['Asset ID', 'Type', 'Source', 'Eligibility']],
      body: exportData.ragResources.map(r => [
        r.assetId.slice(0, 8),
        r.resourceType,
        r.sourceReference.slice(0, 30),
        r.eligibilityStatus,
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ---- 6. SENSITIVE DATA GOVERNANCE ----
  if (yPos > 200) { doc.addPage(); yPos = margin; }
  addTitle('6. Sensitive Data Governance', 1);
  if (exportData.sensitiveDataAssessments.length === 0) {
    addText('No records available for this section.');
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Subject', 'Status', 'PII', 'Financial', 'Confidential']],
      body: exportData.sensitiveDataAssessments.map(s => [
        s.id.slice(0, 8),
        `${s.subjectType}/${s.subjectId.slice(0, 8)}`,
        s.status,
        s.piiDetected ? 'Yes' : 'No',
        s.financialDataDetected ? 'Yes' : 'No',
        s.confidentialDataDetected ? 'Yes' : 'No',
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ---- 7. DRIFT ASSESSMENTS ----
  if (yPos > 200) { doc.addPage(); yPos = margin; }
  addTitle('7. Drift Assessments', 1);
  if (exportData.driftAssessments.length === 0) {
    addText('No records available for this section.');
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Subject', 'Type', 'Severity', 'Assessed']],
      body: exportData.driftAssessments.map(d => [
        d.id.slice(0, 8),
        `${d.subjectType}/${d.subjectId.slice(0, 8)}`,
        d.driftType,
        d.severity,
        new Date(d.assessedAt).toLocaleDateString(),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ---- 8. GOVERNANCE ASSESSMENTS ----
  if (yPos > 200) { doc.addPage(); yPos = margin; }
  addTitle('8. Governance Assessments', 1);
  if (exportData.governanceAssessments.length === 0) {
    addText('No records available for this section.');
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Subject', 'Status', 'Evidence', 'Reviews']],
      body: exportData.governanceAssessments.map(g => [
        g.id.slice(0, 8),
        `${g.subjectType}/${g.subjectId.slice(0, 8)}`,
        g.status,
        `${g.evidenceCoverageAvailable}/${g.evidenceCoverageRequired}`,
        String(g.humanReviewsCount),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ---- 9. HUMAN REVIEW AND DECISIONS ----
  if (yPos > 200) { doc.addPage(); yPos = margin; }
  addTitle('9. Human Review and Decisions', 1);
  if (exportData.humanReviews.length === 0) {
    addText('No records available for this section.');
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Type', 'Priority', 'Status', 'Decision', 'Created']],
      body: exportData.humanReviews.map(r => [
        r.id.slice(0, 8),
        r.type.slice(0, 20),
        r.priority,
        r.status,
        (r.decision || '').slice(0, 20),
        new Date(r.createdAt).toLocaleDateString(),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ---- 10. EVIDENCE ----
  if (yPos > 200) { doc.addPage(); yPos = margin; }
  addTitle('10. Evidence', 1);
  if (exportData.evidenceRecords.length === 0) {
    addText('No records available for this section.');
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Type', 'Subject', 'Actor', 'Timestamp']],
      body: exportData.evidenceRecords.slice(0, 50).map(e => [
        e.id.slice(0, 8),
        e.type.slice(0, 20),
        `${e.subjectType}/${e.subjectId.slice(0, 8)}`,
        e.actor.slice(0, 20),
        new Date(e.timestamp).toLocaleString(),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    if (exportData.evidenceRecords.length > 50) {
      addText(`... and ${exportData.evidenceRecords.length - 50} more evidence records.`);
    }
  }

  // ---- 11. AUDIT TRAIL ----
  if (yPos > 200) { doc.addPage(); yPos = margin; }
  addTitle('11. Audit Trail', 1);
  if (exportData.auditEvents.length === 0) {
    addText('No records available for this section.');
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Actor', 'Action', 'Resource', 'Timestamp']],
      body: exportData.auditEvents.slice(0, 50).map(e => [
        e.id.slice(0, 8),
        e.actor.slice(0, 20),
        e.action,
        `${e.resourceType}/${e.resourceId.slice(0, 8)}`,
        new Date(e.timestamp).toLocaleString(),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    if (exportData.auditEvents.length > 50) {
      addText(`... and ${exportData.auditEvents.length - 50} more audit events.`);
    }
  }

  // ---- 12. CERTIFICATION STATUS ----
  if (yPos > 200) { doc.addPage(); yPos = margin; }
  addTitle('12. Certification Status', 1);
  if (exportData.certifications.length === 0) {
    addText('No records available for this section.');
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Subject', 'State', 'Granted', 'Expires']],
      body: exportData.certifications.map(c => [
        c.id.slice(0, 8),
        `${c.subjectType}/${c.subjectId.slice(0, 8)}`,
        c.state,
        c.grantedAt ? new Date(c.grantedAt).toLocaleDateString() : 'N/A',
        c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'N/A',
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ---- 13. GOVERNANCE TIMELINE ----
  if (yPos > 200) { doc.addPage(); yPos = margin; }
  addTitle('13. Governance Timeline', 1);
  if (exportData.timelineEvents.length === 0) {
    addText('No records available for this section.');
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [['Timestamp', 'Category', 'Type', 'Subject', 'Actor']],
      body: exportData.timelineEvents.slice(0, 50).map(t => [
        new Date(t.timestamp).toLocaleString(),
        t.category,
        t.type.slice(0, 20),
        `${t.subjectType}/${t.subjectId.slice(0, 8)}`,
        t.actor.slice(0, 20),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    if (exportData.timelineEvents.length > 50) {
      addText(`... and ${exportData.timelineEvents.length - 50} more timeline events.`);
    }
  }

  // ---- 14. EXPORT METADATA ----
  if (yPos > 200) { doc.addPage(); yPos = margin; }
  addTitle('14. Export Metadata', 1);
  addKeyValue('Report Title', exportData.reportTitle);
  addKeyValue('Export Timestamp', exportData.exportTimestamp);
  addKeyValue('Export Version', exportData.exportVersion);
  addKeyValue('Application Mode', exportData.applicationMode);
  yPos += 5;
  addText('This report was generated from the AI Data Catalog Baseline Audit system.');
  addText('All data represents governance metadata only. No source data, credentials, or secrets are included.');
  addText('For questions about this report, contact the data governance team.');

  // Add page numbers
  addPageNumber();

  return doc;
}

// ---- PDF Binary Output ----

export function generatePDFBlob(exportData: CanonicalExportObject): Blob {
  const doc = generatePDFReport(exportData);
  return doc.output('blob');
}
