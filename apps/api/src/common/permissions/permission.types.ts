export const PERMISSIONS = {
  APPROVAL_VIEW: 'approval:view',
  APPROVAL_REQUEST: 'approval:request',
  APPROVAL_APPROVE: 'approval:approve',
  APPROVAL_REJECT: 'approval:reject',
  APPROVAL_CANCEL: 'approval:cancel',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
