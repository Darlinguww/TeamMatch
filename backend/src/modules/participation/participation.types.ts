export type ParticipationRequestKind = 'JOIN_PROJECT' | 'ROLE_APPLICATION';
export type ParticipationRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ParticipationRequest {
  requestId: string;
  kind: ParticipationRequestKind;
  status: ParticipationRequestStatus;
  projectId: string;
  applicantUserId: string;
  applicantDisplayName: string;
  roleName: string | null;
  message: string | null;
  createdAt: string;
}

export interface RoleVacancy {
  roleName: string;
  headcount: number;
  filled: number;
  available: number;
}
