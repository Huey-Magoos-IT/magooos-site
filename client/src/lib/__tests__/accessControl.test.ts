import {
  hasRole,
  hasAnyRole,
  hasLocationAccess,
  hasGroupAccess,
  isLocationAdmin,
  isLocationUser,
  isPriceUser,
  isPriceAdmin,
} from '../accessControl';

// Mock TeamRole type for testing
const createTeamRole = (roleName: string) => ({
  id: Math.random(),
  teamId: 1,
  roleId: 1,
  role: {
    id: 1,
    name: roleName,
    description: null,
  },
});

describe('accessControl', () => {
  describe('hasRole', () => {
    it('returns false for undefined teamRoles', () => {
      expect(hasRole(undefined, 'DATA')).toBe(false);
    });

    it('returns false for empty teamRoles array', () => {
      expect(hasRole([], 'DATA')).toBe(false);
    });

    it('returns true when user has the exact role', () => {
      const teamRoles = [createTeamRole('DATA')];
      expect(hasRole(teamRoles, 'DATA')).toBe(true);
    });

    it('returns false when user does not have the role', () => {
      const teamRoles = [createTeamRole('REPORTING')];
      expect(hasRole(teamRoles, 'DATA')).toBe(false);
    });

    it('returns true when user has ADMIN role (admin bypass)', () => {
      const teamRoles = [createTeamRole('ADMIN')];
      expect(hasRole(teamRoles, 'DATA')).toBe(true);
      expect(hasRole(teamRoles, 'REPORTING')).toBe(true);
      expect(hasRole(teamRoles, 'SCANS')).toBe(true);
    });

    it('handles case-insensitive role comparison', () => {
      const teamRoles = [createTeamRole('DATA')];
      expect(hasRole(teamRoles, 'data')).toBe(true);
      expect(hasRole(teamRoles, 'Data')).toBe(true);
    });

    it('works with multiple roles', () => {
      const teamRoles = [createTeamRole('DATA'), createTeamRole('REPORTING')];
      expect(hasRole(teamRoles, 'DATA')).toBe(true);
      expect(hasRole(teamRoles, 'REPORTING')).toBe(true);
      expect(hasRole(teamRoles, 'SCANS')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('returns false for undefined teamRoles', () => {
      expect(hasAnyRole(undefined, ['DATA', 'REPORTING'])).toBe(false);
    });

    it('returns false for empty teamRoles array', () => {
      expect(hasAnyRole([], ['DATA', 'REPORTING'])).toBe(false);
    });

    it('returns true when user has one of the required roles', () => {
      const teamRoles = [createTeamRole('DATA')];
      expect(hasAnyRole(teamRoles, ['DATA', 'REPORTING'])).toBe(true);
    });

    it('returns true when user has multiple matching roles', () => {
      const teamRoles = [createTeamRole('DATA'), createTeamRole('REPORTING')];
      expect(hasAnyRole(teamRoles, ['DATA', 'REPORTING'])).toBe(true);
    });

    it('returns false when user has none of the required roles', () => {
      const teamRoles = [createTeamRole('SCANS')];
      expect(hasAnyRole(teamRoles, ['DATA', 'REPORTING'])).toBe(false);
    });

    it('returns true when user has ADMIN role (admin bypass)', () => {
      const teamRoles = [createTeamRole('ADMIN')];
      expect(hasAnyRole(teamRoles, ['DATA', 'REPORTING'])).toBe(true);
    });

    it('handles case-insensitive role comparison', () => {
      const teamRoles = [createTeamRole('DATA')];
      expect(hasAnyRole(teamRoles, ['data', 'reporting'])).toBe(true);
    });

    it('handles empty required roles array', () => {
      const teamRoles = [createTeamRole('DATA')];
      expect(hasAnyRole(teamRoles, [])).toBe(false);
    });
  });

  describe('hasLocationAccess', () => {
    it('returns false for undefined userLocations', () => {
      expect(hasLocationAccess(undefined, '123')).toBe(false);
    });

    it('returns false for empty userLocations array', () => {
      expect(hasLocationAccess([], '123')).toBe(false);
    });

    it('returns true when locationId is in userLocations', () => {
      const userLocations = ['123', '456', '789'];
      expect(hasLocationAccess(userLocations, '123')).toBe(true);
      expect(hasLocationAccess(userLocations, '456')).toBe(true);
    });

    it('returns false when locationId is not in userLocations', () => {
      const userLocations = ['123', '456'];
      expect(hasLocationAccess(userLocations, '789')).toBe(false);
    });

    it('handles string comparison correctly', () => {
      const userLocations = ['123'];
      // String '123' should match
      expect(hasLocationAccess(userLocations, '123')).toBe(true);
      // Different string should not match
      expect(hasLocationAccess(userLocations, '1234')).toBe(false);
    });
  });

  describe('hasGroupAccess', () => {
    it('returns false for null userGroupId', () => {
      expect(hasGroupAccess(null, 1)).toBe(false);
    });

    it('returns false for undefined userGroupId', () => {
      expect(hasGroupAccess(undefined, 1)).toBe(false);
    });

    it('returns true when userGroupId matches groupId', () => {
      expect(hasGroupAccess(1, 1)).toBe(true);
      expect(hasGroupAccess(42, 42)).toBe(true);
    });

    it('returns false when userGroupId does not match groupId', () => {
      expect(hasGroupAccess(1, 2)).toBe(false);
      expect(hasGroupAccess(42, 43)).toBe(false);
    });

    it('returns false for zero userGroupId (falsy check)', () => {
      // Note: The implementation treats 0 as falsy, so it returns false
      // This is by design - group IDs should be positive integers
      expect(hasGroupAccess(0, 0)).toBe(false);
      expect(hasGroupAccess(0, 1)).toBe(false);
    });
  });

  describe('isLocationAdmin', () => {
    it('returns false for undefined teamRoles', () => {
      expect(isLocationAdmin(undefined)).toBe(false);
    });

    it('returns false for empty teamRoles array', () => {
      expect(isLocationAdmin([])).toBe(false);
    });

    it('returns true when user has LOCATION_ADMIN role', () => {
      const teamRoles = [createTeamRole('LOCATION_ADMIN')];
      expect(isLocationAdmin(teamRoles)).toBe(true);
    });

    it('returns true when user has ADMIN role', () => {
      const teamRoles = [createTeamRole('ADMIN')];
      expect(isLocationAdmin(teamRoles)).toBe(true);
    });

    it('returns false when user has neither LOCATION_ADMIN nor ADMIN', () => {
      const teamRoles = [createTeamRole('DATA'), createTeamRole('REPORTING')];
      expect(isLocationAdmin(teamRoles)).toBe(false);
    });

    it('returns true when user has both LOCATION_ADMIN and other roles', () => {
      const teamRoles = [createTeamRole('LOCATION_ADMIN'), createTeamRole('DATA')];
      expect(isLocationAdmin(teamRoles)).toBe(true);
    });
  });

  describe('isLocationUser', () => {
    it('returns false for undefined teamRoles', () => {
      expect(isLocationUser(undefined)).toBe(false);
    });

    it('returns false for empty teamRoles array', () => {
      expect(isLocationUser([])).toBe(false);
    });

    it('returns true when user has LOCATION_USER role', () => {
      const teamRoles = [createTeamRole('LOCATION_USER')];
      expect(isLocationUser(teamRoles)).toBe(true);
    });

    it('returns false when user does not have LOCATION_USER role', () => {
      const teamRoles = [createTeamRole('DATA')];
      expect(isLocationUser(teamRoles)).toBe(false);
    });

    it('returns false when user has ADMIN role (no admin bypass for this check)', () => {
      // Note: isLocationUser specifically checks for LOCATION_USER, not ADMIN
      const teamRoles = [createTeamRole('ADMIN')];
      expect(isLocationUser(teamRoles)).toBe(false);
    });
  });

  describe('isPriceUser', () => {
    it('returns false for undefined teamRoles', () => {
      expect(isPriceUser(undefined)).toBe(false);
    });

    it('returns false for empty teamRoles array', () => {
      expect(isPriceUser([])).toBe(false);
    });

    it('returns true when user has PRICE_USER role', () => {
      const teamRoles = [createTeamRole('PRICE_USER')];
      expect(isPriceUser(teamRoles)).toBe(true);
    });

    it('returns false when user does not have PRICE_USER role', () => {
      const teamRoles = [createTeamRole('DATA')];
      expect(isPriceUser(teamRoles)).toBe(false);
    });

    it('returns false when user has ADMIN role (no admin bypass)', () => {
      const teamRoles = [createTeamRole('ADMIN')];
      expect(isPriceUser(teamRoles)).toBe(false);
    });
  });

  describe('isPriceAdmin', () => {
    it('returns false for undefined teamRoles', () => {
      expect(isPriceAdmin(undefined)).toBe(false);
    });

    it('returns false for empty teamRoles array', () => {
      expect(isPriceAdmin([])).toBe(false);
    });

    it('returns true when user has PRICE_ADMIN role', () => {
      const teamRoles = [createTeamRole('PRICE_ADMIN')];
      expect(isPriceAdmin(teamRoles)).toBe(true);
    });

    it('returns true when user has ADMIN role', () => {
      const teamRoles = [createTeamRole('ADMIN')];
      expect(isPriceAdmin(teamRoles)).toBe(true);
    });

    it('returns false when user has neither PRICE_ADMIN nor ADMIN', () => {
      const teamRoles = [createTeamRole('DATA'), createTeamRole('PRICE_USER')];
      expect(isPriceAdmin(teamRoles)).toBe(false);
    });
  });
});
