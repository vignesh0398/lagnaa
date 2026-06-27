export {
  canAccessPath,
  DEFAULT_MEMBER_FEATURES,
  getMemberFeatures,
  isAdminOnlyPath,
  MEMBER_ACCESS_SUMMARY,
  MEMBER_FEATURE_OPTIONS,
  type MemberFeature,
} from './memberFeatures';

export function isAdmin(user: { role?: string } | null | undefined): boolean {
  return user?.role === 'admin';
}