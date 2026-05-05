export const ACCESS_ROLES = {
  SUPERVISOR: "Supervisor",
  USER_PRE_POLICY_ALL: "User (Pre-Policy)",
  USER_PRE_POLICY_ONLY: "User (Pre-Policy only)",
  USER_CLAIMS_ALL: "User (Claims)",
  USER_CLAIMS_ONLY: "User (Claims only)",
};

export const ALL_ACCESS_ROLES = Object.values(ACCESS_ROLES);

/**
 * Claims includes Windshield.
 * Pre-Policy corresponds to Vehicle Inspection.
 */
export function getAccessConfig(role) {
  switch (role) {
    case ACCESS_ROLES.SUPERVISOR:
      return {
        canAccessPrePolicy: true,
        canAccessClaims: true,
        scope: "all", // all users
      };
    case ACCESS_ROLES.USER_PRE_POLICY_ALL:
      return {
        canAccessPrePolicy: true,
        canAccessClaims: false,
        scope: "all",
      };
    case ACCESS_ROLES.USER_PRE_POLICY_ONLY:
      return {
        canAccessPrePolicy: true,
        canAccessClaims: false,
        scope: "self",
      };
    case ACCESS_ROLES.USER_CLAIMS_ALL:
      return {
        canAccessPrePolicy: false,
        canAccessClaims: true,
        scope: "all",
      };
    case ACCESS_ROLES.USER_CLAIMS_ONLY:
      return {
        canAccessPrePolicy: false,
        canAccessClaims: true,
        scope: "self",
      };
    default:
      // safest default: supervisor-like for demo unless role is set
      return {
        canAccessPrePolicy: true,
        canAccessClaims: true,
        scope: "all",
      };
  }
}

export function isClaimsType(type) {
  return type === "motor" || type === "windshield";
}

export function isPrePolicyType(type) {
  return type === "vehicle";
}

