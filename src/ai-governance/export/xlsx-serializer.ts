// ============================================================
// AI GOVERNANCE — XLSX Export Serializer
// ============================================================
//
// Generates a real .xlsx workbook from the canonical export object.
// Uses the 'xlsx' library (SheetJS) for standards-compliant output.
//

import * as XLSX from 'xlsx';
import type { CanonicalExportObject } from './canonical-export';

// ---- Helpers ----

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) {
      result[newKey] = '';
    } else if (Array.isArray(value)) {
      result[newKey] = value.length > 0 ? value.join('; ') : '';
    } else if (typeof value === 'object') {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = value as string | number | boolean;
    }
  }
  return result;
}

function arrayToSheet<T extends Record<string, unknown>>(data: T[], headers?: string[]): XLSX.WorkSheet {
  if (data.length === 0) {
    // Create sheet with headers only
    const ws = XLSX.utils.aoa_to_sheet([headers || ['No records available']]);
    return ws;
  }

  // Flatten nested objects
  const flattened = data.map(item => flattenObject(item));
  const ws = XLSX.utils.json_to_sheet(flattened, { header: headers });
  return ws;
}

function addNoRecordsSheet(headers: string[]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet([headers, ['No records available for this section.']]);
}

// ---- XLSX Generator ----

export function generateXLSXWorkbook(exportData: CanonicalExportObject): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Executive Summary
  const summaryData = [
    { Field: 'Export Timestamp', Value: exportData.executiveSummary.exportTimestamp },
    { Field: 'Application Mode', Value: exportData.executiveSummary.applicationMode },
    { Field: 'Export Version', Value: exportData.executiveSummary.exportVersion },
    { Field: 'Total AI Use Cases', Value: exportData.executiveSummary.totalAIUseCases },
    { Field: 'Total Training Datasets', Value: exportData.executiveSummary.totalTrainingDatasets },
    { Field: 'Total Models', Value: exportData.executiveSummary.totalModels },
    { Field: 'Total RAG Resources', Value: exportData.executiveSummary.totalRAGResources },
    { Field: 'Total Drift Assessments', Value: exportData.executiveSummary.totalDriftAssessments },
    { Field: 'Total Sensitive Data Assessments', Value: exportData.executiveSummary.totalSensitiveDataAssessments },
    { Field: 'Total Governance Assessments', Value: exportData.executiveSummary.totalGovernanceAssessments },
    { Field: 'Total Evidence Records', Value: exportData.executiveSummary.totalEvidenceRecords },
    { Field: 'Total Audit Records', Value: exportData.executiveSummary.totalAuditRecords },
    { Field: 'Total Human Reviews', Value: exportData.executiveSummary.totalHumanReviews },
    { Field: 'Total Certifications', Value: exportData.executiveSummary.totalCertifications },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Executive Summary');

  // 2. AI Use Cases
  if (exportData.aiUseCases.length > 0) {
    const useCasesSheet = arrayToSheet(exportData.aiUseCases.map(uc => ({
      ID: uc.id,
      Name: uc.name,
      Description: uc.description,
      Purpose: uc.purpose,
      'Business Domain': uc.businessDomain,
      Status: uc.status,
      'Model References': uc.modelReferences.join('; '),
      'Dataset References': uc.datasetReferences.join('; '),
      'RAG References': uc.ragResourceReferences.join('; '),
      'Created At': uc.createdAt,
      'Updated At': uc.updatedAt,
    })));
    XLSX.utils.book_append_sheet(wb, useCasesSheet, 'AI Use Cases');
  } else {
    XLSX.utils.book_append_sheet(wb, addNoRecordsSheet(['ID', 'Name', 'Description', 'Purpose', 'Status']), 'AI Use Cases');
  }

  // 3. Training Data
  if (exportData.trainingData.length > 0) {
    const trainingSheet = arrayToSheet(exportData.trainingData.map(td => ({
      ID: td.id,
      'Dataset Asset ID': td.datasetAssetId,
      'Dataset Version ID': td.datasetVersionId,
      Purpose: td.purpose,
      'Intended Use': td.intendedUse,
      'Lineage Status': td.lineageStatus,
      'Classification Status': td.classificationStatus,
      'Quality Status': td.qualityStatus,
      'Approval Status': td.approvalStatus,
      'Created At': td.createdAt,
      'Updated At': td.updatedAt,
    })));
    XLSX.utils.book_append_sheet(wb, trainingSheet, 'Training Data');
  } else {
    XLSX.utils.book_append_sheet(wb, addNoRecordsSheet(['ID', 'Dataset Asset ID', 'Purpose', 'Approval Status']), 'Training Data');
  }

  // 4. Models
  if (exportData.models.length > 0) {
    const modelsSheet = arrayToSheet(exportData.models.map(m => ({
      'Asset ID': m.assetId,
      'Model Name': m.modelName,
      'Model Version': m.modelVersion,
      'Model Type': m.modelType,
      Purpose: m.purpose,
      'Intended Use': m.intendedUse,
      'Governance Status': m.governanceStatus,
      'Input Fields': m.inputFieldsCount,
      'Training Datasets': m.trainingDatasetsCount,
      'Validation Datasets': m.validationDatasetsCount,
      'Test Datasets': m.testDatasetsCount,
      'Created At': m.createdAt,
      'Updated At': m.updatedAt,
    })));
    XLSX.utils.book_append_sheet(wb, modelsSheet, 'Models');
  } else {
    XLSX.utils.book_append_sheet(wb, addNoRecordsSheet(['Asset ID', 'Model Name', 'Model Version', 'Governance Status']), 'Models');
  }

  // 5. RAG Resources
  if (exportData.ragResources.length > 0) {
    const ragSheet = arrayToSheet(exportData.ragResources.map(r => ({
      'Asset ID': r.assetId,
      'Resource Type': r.resourceType,
      'Source Reference': r.sourceReference,
      'Eligibility Status': r.eligibilityStatus,
      'Created At': r.createdAt,
      'Updated At': r.updatedAt,
    })));
    XLSX.utils.book_append_sheet(wb, ragSheet, 'RAG Resources');
  } else {
    XLSX.utils.book_append_sheet(wb, addNoRecordsSheet(['Asset ID', 'Resource Type', 'Eligibility Status']), 'RAG Resources');
  }

  // 6. Drift Assessments
  if (exportData.driftAssessments.length > 0) {
    const driftSheet = arrayToSheet(exportData.driftAssessments.map(d => ({
      ID: d.id,
      'Subject Type': d.subjectType,
      'Subject ID': d.subjectId,
      'Drift Type': d.driftType,
      Severity: d.severity,
      Reason: d.reason,
      'Changes Count': d.changesCount,
      'Affected Resources': d.affectedResourcesCount,
      'Assessed At': d.assessedAt,
    })));
    XLSX.utils.book_append_sheet(wb, driftSheet, 'Drift Assessments');
  } else {
    XLSX.utils.book_append_sheet(wb, addNoRecordsSheet(['ID', 'Subject Type', 'Drift Type', 'Severity']), 'Drift Assessments');
  }

  // 7. Sensitive Data
  if (exportData.sensitiveDataAssessments.length > 0) {
    const sensitiveSheet = arrayToSheet(exportData.sensitiveDataAssessments.map(s => ({
      ID: s.id,
      'Subject Type': s.subjectType,
      'Subject ID': s.subjectId,
      Status: s.status,
      'PII Detected': s.piiDetected ? 'Yes' : 'No',
      'Financial Data': s.financialDataDetected ? 'Yes' : 'No',
      'Confidential Data': s.confidentialDataDetected ? 'Yes' : 'No',
      'Classifications': s.classificationsCount,
      'Reasons': s.reasons.join('; '),
      'Assessed At': s.assessedAt,
    })));
    XLSX.utils.book_append_sheet(wb, sensitiveSheet, 'Sensitive Data');
  } else {
    XLSX.utils.book_append_sheet(wb, addNoRecordsSheet(['ID', 'Subject Type', 'Status']), 'Sensitive Data');
  }

  // 8. AI Governance Assessments
  if (exportData.governanceAssessments.length > 0) {
    const govSheet = arrayToSheet(exportData.governanceAssessments.map(g => ({
      ID: g.id,
      'Subject Type': g.subjectType,
      'Subject ID': g.subjectId,
      Status: g.status,
      'Dataset Assessments': g.datasetAssessmentsCount,
      'RAG Assessments': g.ragAssessmentsCount,
      'Evidence Required': g.evidenceCoverageRequired,
      'Evidence Available': g.evidenceCoverageAvailable,
      'Evidence Status': g.evidenceCoverageStatus,
      'Human Reviews': g.humanReviewsCount,
      'Reasons': g.reasons.join('; '),
      'Created At': g.createdAt,
      'Completed At': g.completedAt || '',
    })));
    XLSX.utils.book_append_sheet(wb, govSheet, 'Governance Assessments');
  } else {
    XLSX.utils.book_append_sheet(wb, addNoRecordsSheet(['ID', 'Subject Type', 'Status']), 'Governance Assessments');
  }

  // 9. Evidence
  if (exportData.evidenceRecords.length > 0) {
    const evidenceSheet = arrayToSheet(exportData.evidenceRecords.map(e => ({
      ID: e.id,
      Type: e.type,
      'Subject Type': e.subjectType,
      'Subject ID': e.subjectId,
      Actor: e.actor,
      Timestamp: e.timestamp,
      Source: e.source,
    })));
    XLSX.utils.book_append_sheet(wb, evidenceSheet, 'Evidence');
  } else {
    XLSX.utils.book_append_sheet(wb, addNoRecordsSheet(['ID', 'Type', 'Subject Type', 'Actor']), 'Evidence');
  }

  // 10. Audit
  if (exportData.auditEvents.length > 0) {
    const auditSheet = arrayToSheet(exportData.auditEvents.map(e => ({
      ID: e.id,
      Actor: e.actor,
      Action: e.action,
      'Resource Type': e.resourceType,
      'Resource ID': e.resourceId,
      Timestamp: e.timestamp,
    })));
    XLSX.utils.book_append_sheet(wb, auditSheet, 'Audit');
  } else {
    XLSX.utils.book_append_sheet(wb, addNoRecordsSheet(['ID', 'Actor', 'Action', 'Resource Type']), 'Audit');
  }

  // 11. Human Reviews
  if (exportData.humanReviews.length > 0) {
    const reviewsSheet = arrayToSheet(exportData.humanReviews.map(r => ({
      ID: r.id,
      Type: r.type,
      'Subject Type': r.subjectType,
      'Subject ID': r.subjectId,
      Reason: r.reason,
      Priority: r.priority,
      Status: r.status,
      'Assigned To': r.assignedTo || '',
      'Created At': r.createdAt,
      'Resolved At': r.resolvedAt || '',
      Decision: r.decision || '',
    })));
    XLSX.utils.book_append_sheet(wb, reviewsSheet, 'Human Reviews');
  } else {
    XLSX.utils.book_append_sheet(wb, addNoRecordsSheet(['ID', 'Type', 'Priority', 'Status']), 'Human Reviews');
  }

  // 12. Certifications
  if (exportData.certifications.length > 0) {
    const certSheet = arrayToSheet(exportData.certifications.map(c => ({
      ID: c.id,
      'Certification ID': c.certificationId,
      'Subject Type': c.subjectType,
      'Subject ID': c.subjectId,
      State: c.state,
      'Granted At': c.grantedAt || '',
      'Granted By': c.grantedBy || '',
      'Expires At': c.expiresAt || '',
      'Revoked At': c.revokedAt || '',
    })));
    XLSX.utils.book_append_sheet(wb, certSheet, 'Certifications');
  } else {
    XLSX.utils.book_append_sheet(wb, addNoRecordsSheet(['ID', 'Subject Type', 'State']), 'Certifications');
  }

  // 13. Governance Timeline
  if (exportData.timelineEvents.length > 0) {
    const timelineSheet = arrayToSheet(exportData.timelineEvents.map(t => ({
      ID: t.id,
      Timestamp: t.timestamp,
      Type: t.type,
      Category: t.category,
      'Subject Type': t.subjectType,
      'Subject ID': t.subjectId,
      Actor: t.actor,
      Description: t.description,
    })));
    XLSX.utils.book_append_sheet(wb, timelineSheet, 'Governance Timeline');
  } else {
    XLSX.utils.book_append_sheet(wb, addNoRecordsSheet(['ID', 'Timestamp', 'Type', 'Category']), 'Governance Timeline');
  }

  return wb;
}

// ---- XLSX Binary Output ----

export function generateXLSXBuffer(exportData: CanonicalExportObject): Uint8Array {
  const wb = generateXLSXWorkbook(exportData);
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
}
