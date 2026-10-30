/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { formatISTDateMedium, getNow } from '../utils/dateTimeUtils';

export interface StaffDocument {
  id: string;
  staffId: string;
  title: string;
  description: string;
  issuedDate: string;
  status: 'Approved' | 'Completed' | 'Issued' | 'Pending';
  fileContent?: string;
  fileSize?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STAFF_DOCUMENTS_STORAGE_KEY = 'offsleek_staff_documents_v1';

export const INITIAL_STAFF_DOCUMENTS: StaffDocument[] = [
  {
    id: 'DOC-2026-001',
    staffId: 'T001',
    title: 'Experience Letter',
    description: 'Employment experience certificate',
    issuedDate: '05 Jan 2026',
    status: 'Approved',
    fileSize: '245 KB',
    fileContent: 'GREENWOOD INTERNATIONAL SCHOOL\nOfficial Experience Certificate\n\nThis is to certify that Ms. Priya Sharma has been successfully employed as a Senior Mathematics Teacher (Grade 5 - A) at Greenwood International School from June 2023 to January 2026. Her performance, dedication, and professional conduct have been exemplary.\n\nPrincipal Signature',
  },
  {
    id: 'DOC-2025-002',
    staffId: 'T001',
    title: 'Employment Certificate',
    description: 'Official employment certificate',
    issuedDate: '12 Dec 2025',
    status: 'Completed',
    fileSize: '180 KB',
    fileContent: 'GREENWOOD INTERNATIONAL SCHOOL\nEmployment Certificate\n\nThis is to confirm that Ms. Priya Sharma is a permanent full-time faculty member holding the designation of Class Teacher & Senior Educator at Greenwood International School, Bangalore.\n\nHR Department',
  },
  {
    id: 'DOC-2025-003',
    staffId: 'T001',
    title: 'Salary Certificate',
    description: 'Income and employment certificate',
    issuedDate: '20 Oct 2025',
    status: 'Issued',
    fileSize: '210 KB',
    fileContent: 'GREENWOOD INTERNATIONAL SCHOOL\nSalary & Income Certificate\n\nCertified that Ms. Priya Sharma (Staff ID: T001) is receiving a monthly consolidated remuneration as per the 7th Pay Commission guidelines for faculty members at Greenwood International School.\n\nAccounts Directorate',
  },
  {
    id: 'DOC-2025-004',
    staffId: 'T001',
    title: 'Service Record',
    description: 'Employment service record',
    issuedDate: '15 Aug 2025',
    status: 'Pending',
    fileSize: '310 KB',
    fileContent: 'GREENWOOD INTERNATIONAL SCHOOL\nEmployment Service Record Summary\n\nComprehensive service record including professional qualifications, periodic evaluations, and completed pedagogical training modules.\n\nAdministration Office',
  },
];

export function getStaffDocuments(staffId: string = 'T001'): StaffDocument[] {
  try {
    const raw = localStorage.getItem(STAFF_DOCUMENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STAFF_DOCUMENTS_STORAGE_KEY, JSON.stringify(INITIAL_STAFF_DOCUMENTS));
      return INITIAL_STAFF_DOCUMENTS.filter((d) => d.staffId === staffId);
    }
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : INITIAL_STAFF_DOCUMENTS;
    return list.filter((d: StaffDocument) => d.staffId === staffId);
  } catch (err) {
    console.error('Failed to get staff documents:', err);
    return INITIAL_STAFF_DOCUMENTS.filter((d) => d.staffId === staffId);
  }
}

export function downloadStaffDocument(doc: StaffDocument) {
  if (doc.status === 'Pending') {
    throw new Error('Document is still pending issuance and cannot be downloaded.');
  }
  const blob = new Blob([doc.fileContent || doc.description], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title.replace(/\s+/g, '_')}_${doc.id}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function addStaffDocument(
  newDoc: Omit<StaffDocument, 'id' | 'issuedDate' | 'createdAt' | 'updatedAt'> & { issuedDate?: string }
): StaffDocument {
  const now = getNow();
  const nowIso = now.toISOString();
  const raw = localStorage.getItem(STAFF_DOCUMENTS_STORAGE_KEY);
  const list: StaffDocument[] = raw ? JSON.parse(raw) : [...INITIAL_STAFF_DOCUMENTS];

  const created: StaffDocument = {
    ...newDoc,
    id: `DOC-${now.getFullYear()}-${String(list.length + 1).padStart(3, '0')}`,
    issuedDate: newDoc.issuedDate || formatISTDateMedium(now),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const updated = [created, ...list];
  localStorage.setItem(STAFF_DOCUMENTS_STORAGE_KEY, JSON.stringify(updated));
  return created;
}

export function updateStaffDocument(
  id: string,
  updates: Partial<Omit<StaffDocument, 'id' | 'createdAt'>>
): StaffDocument {
  const raw = localStorage.getItem(STAFF_DOCUMENTS_STORAGE_KEY);
  const list: StaffDocument[] = raw ? JSON.parse(raw) : [...INITIAL_STAFF_DOCUMENTS];
  const index = list.findIndex((d) => d.id === id);
  if (index === -1) {
    throw new Error(`Document ${id} not found.`);
  }
  const nowIso = getNow().toISOString();
  const existing = list[index];
  const updatedDoc: StaffDocument = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: nowIso,
  };
  list[index] = updatedDoc;
  localStorage.setItem(STAFF_DOCUMENTS_STORAGE_KEY, JSON.stringify(list));
  return updatedDoc;
}
