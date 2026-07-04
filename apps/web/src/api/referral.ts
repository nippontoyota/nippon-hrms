import api from '@/lib/axios';

export interface ReferralLink {
  id: string;
  employeeId: string;
  code: string;
  expiresAt: string;
  createdAt: string;
  employee?: {
    id: string;
    name: string;
    department: string;
    status: string;
  };
}

export interface Candidate {
  id: string;
  referralLinkId: string;
  name: string;
  phone: string;
  resumeUrl: string;
  designation: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  referralLink?: ReferralLink;
}

export const referralApi = {
  // Admin Routes
  generateLink: (employeeId: string) => 
    api.post<ReferralLink>('/referrals/generate', { employeeId }).then((res) => res.data),

  listCandidates: () => 
    api.get<Candidate[]>('/candidates').then((res) => res.data),

  updateCandidateStatus: (id: string, status: string) => 
    api.patch(`/candidates/${id}/status`, { status }).then((res) => res.data),

  // Public Routes
  getLinkDetails: (code: string) => 
    api.get<ReferralLink>(`/referrals/${code}`).then((res) => res.data),

  submitCandidate: (code: string, data: { name: string; phone: string; resumeUrl: string; designation: string }) => 
    api.post<Candidate>('/candidates', { code, ...data }).then((res) => res.data),
};
