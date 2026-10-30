/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { formatISTDateMedium, getNow, getNowISO } from '../utils/dateTimeUtils';

export type AnnouncementCategory = 'All' | 'Academic' | 'Events' | 'Holidays' | 'General' | 'Important';

export interface AnnouncementAttachment {
  name: string;
  size: string;
  type: 'pdf';
  pages?: number;
  downloadUrl?: string;
  previewTitle?: string;
  previewSummary?: string;
}

export interface Announcement {
  id: string;
  title: string;
  category: 'Important' | 'Academic' | 'Events' | 'Holidays' | 'General';
  dateStr: string;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
  preview: string;
  fullContent: string;
  publisher: {
    name: string;
    role: string;
    department: string;
  };
  schoolId: string;
  targetGrades: string[]; // e.g. ['All'] or ['Grade 5 - A', 'Grade 6 - A']
  targetRoles: ('STAFF' | 'PARENT' | 'STUDENT')[];
  attachment?: AnnouncementAttachment;
  isImportant?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  role: 'STAFF' | 'PARENT' | 'STUDENT';
  subtext: string;
  avatar: string;
  schoolId: string;
  grade?: string;
  section?: string;
}

export const AVAILABLE_PROFILES: UserProfile[] = [
  {
    id: 'priya-sharma',
    name: 'Priya Sharma',
    role: 'STAFF',
    subtext: 'Staff • Mathematics',
    avatar: '/assets/priya-sharma.png',
    schoolId: 'greenwood-intl',
    grade: 'Grade 5 - A',
  },
  {
    id: 'aarav-mehta',
    name: 'Aarav Mehta',
    role: 'PARENT',
    subtext: 'Grade 6, Section A',
    avatar: '/assets/students/student-01-aarav.png',
    schoolId: 'greenwood-intl',
    grade: 'Grade 6 - A',
    section: 'A',
  },
  {
    id: 'diya-patel',
    name: 'Diya Patel',
    role: 'PARENT',
    subtext: 'Grade 5, Section A',
    avatar: '/assets/students/student-04-diya.png',
    schoolId: 'greenwood-intl',
    grade: 'Grade 5 - A',
    section: 'A',
  },
];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-01-ptm',
    title: 'Parent Teacher Meeting',
    category: 'Important',
    dateStr: '5 Oct 2025',
    timestamp: '2025-10-05T09:30:00Z',
    preview: 'PTM will be held on 15th October 2025 from 9:00 AM to 12:00 PM. Please book your slot through the portal.',
    fullContent: `Dear Parents and Guardians,\n\nOur Term 1 Parent-Teacher Meeting (PTM) has been scheduled for Wednesday, 15th October 2025, from 9:00 AM to 12:00 PM in the senior auditorium and respective classrooms.\n\nKey discussion areas:\n• Individual academic progress and Term 1 review\n• Behavioral and classroom engagement feedback\n• Co-curricular participation and physical education milestones\n\nTo ensure dedicated one-on-one attention with each subject teacher, 10-minute appointment slots must be pre-booked using the parent portal or school mobile app. Slot bookings open on 8th October at 8:00 AM.\n\nWarm regards,\nOffice of Academic Affairs\nGreenwood International School`,
    publisher: {
      name: 'Dr. Alistair Vance',
      role: 'Vice Principal',
      department: 'Academic Affairs',
    },
    schoolId: 'greenwood-intl',
    targetGrades: ['All'],
    targetRoles: ['STAFF', 'PARENT', 'STUDENT'],
    isImportant: true,
  },
  {
    id: 'ann-02-sports-day',
    title: 'Annual Sports Day',
    category: 'Events',
    dateStr: '3 Oct 2025',
    timestamp: '2025-10-03T11:00:00Z',
    preview: 'Join us for the Annual Sports Day celebration on 25th October 2025. All parents are cordially invited.',
    fullContent: `Dear Greenwood Community,\n\nWe are delighted to invite you to our 18th Annual Inter-House Athletic Meet & Sports Day on Saturday, 25th October 2025, at the Greenwood Main Athletic Stadium.\n\nEvent Schedule:\n• 08:30 AM: Arrival & Seating of Parents and Guests\n• 09:00 AM: Torch Lighting Ceremony & March Past\n• 10:00 AM: Track & Field Events (Sprints, Relay, Long Jump)\n• 12:15 PM: Parent-Teacher Friendly Tug of War\n• 01:00 PM: Award of House Championship Trophy\n\nStudents should arrive in their complete House sportswear. Refreshments will be arranged for all guests.\n\nOrganizing Committee\nDepartment of Physical Education`,
    publisher: {
      name: 'Coach Vikram Rathore',
      role: 'Head of Physical Education',
      department: 'Sports & Athletics',
    },
    schoolId: 'greenwood-intl',
    targetGrades: ['All'],
    targetRoles: ['STAFF', 'PARENT', 'STUDENT'],
  },
  {
    id: 'ann-03-term1-syllabus',
    title: 'Term 1 Syllabus Released',
    category: 'Academic',
    dateStr: '28 Sep 2025',
    timestamp: '2025-09-28T14:15:00Z',
    preview: 'The syllabus for Term 1 (2025–26) is now available. Please check the attached document.',
    fullContent: `Dear Students and Parents,\n\nThe comprehensive syllabus for Term 1 Examinations (Academic Session 2025–26) has been finalized and released by the Curriculum Review Board.\n\nPlease review the attached PDF document for chapter weightages, practical evaluation criteria, sample question patterns, and recommended reference materials for all core subjects (Mathematics, Science, English, Social Studies, and Second Language).\n\nExamination commencement date: 17th November 2025.\n\nAcademic Coordinator\nGreenwood International School`,
    publisher: {
      name: 'Mrs. Sunita Raman',
      role: 'Curriculum Director',
      department: 'Department of Academics',
    },
    schoolId: 'greenwood-intl',
    targetGrades: ['All', 'Grade 5 - A', 'Grade 6 - A'],
    targetRoles: ['STAFF', 'PARENT', 'STUDENT'],
    attachment: {
      name: 'Term 1 Syllabus.pdf',
      size: '2.4 MB',
      type: 'pdf',
      pages: 14,
      previewTitle: 'Official Term 1 Curriculum Framework 2025–26',
      previewSummary: 'Contains chapter-wise breakdown, unit tests weightage (20%), and final examination syllabus for Grades 5 through 10.',
    },
  },
  {
    id: 'ann-04-dussehra-holidays',
    title: 'Dussehra Holidays',
    category: 'Holidays',
    dateStr: '25 Sep 2025',
    timestamp: '2025-09-25T10:00:00Z',
    preview: 'The school will remain closed from 10th October 2025 to 12th October 2025 on account of Dussehra.',
    fullContent: `Dear Parents, Staff, and Students,\n\nThis is to notify everyone that Greenwood International School will remain closed from Friday, 10th October 2025 to Sunday, 12th October 2025 on the festive occasion of Dussehra (Vijayadashami).\n\nKey reminders:\n• Regular school sessions will resume promptly on Monday, 13th October 2025.\n• School administrative offices and helpline desk will remain closed during the holidays.\n• Students are encouraged to use this period to revise their Term 1 topics.\n\nWe wish all our students, teachers, and families a joyful and prosperous festive season!\n\nBest Wishes,\nPrincipal's Secretariat\nGreenwood International School`,
    publisher: {
      name: 'Dr. Radhika Sen',
      role: 'Principal',
      department: 'Office of the Principal',
    },
    schoolId: 'greenwood-intl',
    targetGrades: ['All'],
    targetRoles: ['STAFF', 'PARENT', 'STUDENT'],
  },
  {
    id: 'ann-05-uniform-guidelines',
    title: 'School Uniform Guidelines',
    category: 'General',
    dateStr: '20 Sep 2025',
    timestamp: '2025-09-20T16:45:00Z',
    preview: 'Please follow the updated uniform guidelines shared in the attached document.',
    fullContent: `Dear Parents and Students,\n\nTo ensure uniformity, dignity, and neatness across campus, the School Disciplinary Board has published the revised School Uniform Guidelines for the autumn-winter term.\n\nSummary of Guidelines:\n• Regular Uniform: Navy blue blazer with school crest, tailored grey trousers/pleated skirt, crisp white collared shirt, and official Greenwood tie.\n• Footwear: Polished black oxford shoes with navy blue socks. Sports sneakers are restricted to PE days only.\n• Winter Wear: Navy blue V-neck pullover or school blazer. Non-standard cardigans/jackets are strictly prohibited on campus.\n• Hair & Grooming: Neat, natural, and well-groomed appearance is required for all students.\n\nPlease refer to the attached PDF for illustrated diagrams and supplier contact details.\n\nDisciplinary Committee\nGreenwood International School`,
    publisher: {
      name: 'Mr. Kenneth Brooks',
      role: 'Dean of Student Affairs',
      department: 'Student Affairs & Discipline',
    },
    schoolId: 'greenwood-intl',
    targetGrades: ['All'],
    targetRoles: ['STAFF', 'PARENT', 'STUDENT'],
    attachment: {
      name: 'Uniform Guidelines.pdf',
      size: '1.8 MB',
      type: 'pdf',
      pages: 8,
      previewTitle: 'Official Uniform & Dress Code Handbook 2025–26',
      previewSummary: 'Specification sheets for summer, winter, physical education kits, and approved authorized tailors.',
    },
  },
];

const STORAGE_KEY = 'offsleek_announcements_v1';
const PROFILE_KEY = 'offsleek_active_profile_v1';

/**
 * Loads all announcements from localStorage or initializes with defaults
 */
export function getStoredAnnouncements(): Announcement[] {
  if (typeof window === 'undefined') return INITIAL_ANNOUNCEMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ANNOUNCEMENTS));
      return INITIAL_ANNOUNCEMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ANNOUNCEMENTS;
  } catch {
    return INITIAL_ANNOUNCEMENTS;
  }
}

/**
 * Saves announcements to localStorage
 */
export function saveAnnouncementsToStorage(announcements: Announcement[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(announcements));
  } catch (err) {
    console.error('Failed to save announcements to localStorage', err);
  }
}

/**
 * Gets active profile from storage
 */
export function getActiveProfile(): UserProfile {
  if (typeof window === 'undefined') return AVAILABLE_PROFILES[0];
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const found = AVAILABLE_PROFILES.find((p) => p.id === raw);
      if (found) return found;
    }
  } catch {}
  return AVAILABLE_PROFILES[0]; // Default to Priya Sharma (Staff)
}

/**
 * Sets active profile
 */
export function setActiveProfile(profileId: string): UserProfile {
  const found = AVAILABLE_PROFILES.find((p) => p.id === profileId) || AVAILABLE_PROFILES[0];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PROFILE_KEY, found.id);
    } catch {}
  }
  return found;
}

/**
 * Checks if user has management permissions (only authorized staff can create/edit/delete)
 */
export function canManageAnnouncements(userRole: 'STAFF' | 'PARENT' | 'STUDENT'): boolean {
  return userRole === 'STAFF';
}

/**
 * Filters announcements by school, role, student grade, category and search term
 */
export function filterAnnouncements(
  announcements: Announcement[],
  profile: UserProfile,
  category: AnnouncementCategory = 'All',
  searchQuery: string = ''
): Announcement[] {
  return announcements.filter((ann) => {
    // 1. School Isolation: Only match school
    if (ann.schoolId !== profile.schoolId) {
      return false;
    }

    // 2. Role permission: Must target user role
    if (!ann.targetRoles.includes(profile.role)) {
      return false;
    }

    // 3. Grade targeting: If student/parent, verify grade
    if (profile.role !== 'STAFF' && profile.grade) {
      const gradeMatches =
        ann.targetGrades.includes('All') ||
        ann.targetGrades.includes(profile.grade) ||
        (profile.section && ann.targetGrades.some((g) => g.includes(profile.grade!)));
      if (!gradeMatches) {
        return false;
      }
    }

    // 4. Category filter
    if (category !== 'All') {
      if (category === 'Important') {
        if (!ann.isImportant && ann.category !== 'Important') return false;
      } else if (ann.category !== category) {
        return false;
      }
    }

    // 5. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ann.title.toLowerCase().includes(q);
      const matchPreview = ann.preview.toLowerCase().includes(q);
      const matchCategory = ann.category.toLowerCase().includes(q);
      const matchAttachment = ann.attachment?.name.toLowerCase().includes(q);
      if (!matchTitle && !matchPreview && !matchCategory && !matchAttachment) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Adds a new announcement (Staff authorized only)
 */
export function addAnnouncement(newAnn: Omit<Announcement, 'id' | 'timestamp'>): Announcement {
  const current = getStoredAnnouncements();
  const now = getNow();
  const nowIso = now.toISOString();
  const resolvedDateStr =
    !newAnn.dateStr || newAnn.dateStr === 'Today'
      ? formatISTDateMedium(now)
      : newAnn.dateStr;

  const created: Announcement = {
    ...newAnn,
    dateStr: resolvedDateStr,
    id: `ann-${now.getTime()}`,
    timestamp: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const updated = [created, ...current];
  saveAnnouncementsToStorage(updated);
  return created;
}

/**
 * Updates an existing announcement while preserving its original creation timestamp
 */
export function updateAnnouncement(
  id: string,
  updates: Partial<Omit<Announcement, 'id' | 'timestamp' | 'createdAt'>>
): Announcement {
  const current = getStoredAnnouncements();
  const index = current.findIndex((a) => a.id === id);
  if (index === -1) {
    throw new Error(`Announcement ${id} not found.`);
  }
  const nowIso = getNowISO();
  const existing = current[index];
  const updatedAnn: Announcement = {
    ...existing,
    ...updates,
    id: existing.id,
    timestamp: existing.timestamp,
    createdAt: existing.createdAt || existing.timestamp,
    updatedAt: nowIso,
  };
  current[index] = updatedAnn;
  saveAnnouncementsToStorage(current);
  return updatedAnn;
}
