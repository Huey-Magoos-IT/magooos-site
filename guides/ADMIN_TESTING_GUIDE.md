# Administrator Testing & Training Guide

This guide is for IT administrators to understand, test, and manage the Huey Magoo's Portal.

---

## **Part 1: System Architecture Overview**

### How the Portal Works

The portal is a **role-based access control (RBAC)** system. What users can see and do depends on their **Team**, **Roles**, and **Group** assignment.

### The Hierarchy

```
TEAMS (define what roles a user has)
  └── ROLES (define what pages/features a user can access)
        └── GROUPS (define which locations a user can see data for)
              └── USERS (individual people)
```

### Key Concepts

| Concept | What It Is | Example |
|---------|-----------|---------|
| **Team** | A collection of roles assigned to users | "FBC Team" has REPORTING, SCANS, LOCATION_ADMIN |
| **Role** | A permission that unlocks specific features | SCANS unlocks the % of Scans page |
| **Group** | A collection of locations | "Brian's Group" contains 19 franchise locations |
| **User** | An individual person with a login | bsolomonic@hueymagoos.com |

### Available Roles

| Role | What It Unlocks |
|------|-----------------|
| ADMIN | Everything - full system access |
| DATA | Rewards Transactions page |
| REPORTING | Red Flag Reports page |
| SCANS | % of Scans page |
| RAW_DATA | Raw Data page |
| RAW_LOYALTY_REPORTING | Raw Rewards Data page |
| LOCATION_ADMIN | Groups page + create Location Users |
| PRICE_ADMIN | Price Portal + Price Users management |

---

## **Part 2: Setting Up an FBC (End-to-End)**

This is the complete process to onboard a new FBC like Brian Solomonic.

### Step 1: Ensure FBC Team Exists

The FBC team should already exist with these roles:
- REPORTING
- SCANS
- LOCATION_ADMIN

**To verify:**
1. Go to **Teams** page
2. Look for "FBC" team
3. Confirm it has the three roles above

### Step 2: Create a Group for the FBC

**Why:** Groups bundle locations together. Each FBC manages different franchise locations.

**How:**
1. Go to **Groups** page
2. Click **"Create Group"**
3. Enter:
   - **Name:** "Brian Solomonic" (or descriptive name)
   - **Description:** Optional notes
   - **Locations:** Select ALL locations this FBC manages
4. Click **Save**

### Step 3: Create the FBC User Account

**How:**
1. Go to **Users** page
2. Click **"Create User"**
3. Enter:
   - **Username:** `bsolomonic`
   - **Email:** `bsolomonic@hueymagoos.com`
   - **Temp Password:** Generate one (e.g., `S56(SYhag*%4AHHi`)
   - **Team:** Select "FBC"
   - **Locations:** Select all locations (will be overridden by group anyway)
4. Click **Create**

**What happens:**
- User is created in AWS Cognito
- Verification email is sent to the user
- User appears in Users list

### Step 4: Assign the User to Their Group

⚠️ **IMPORTANT:** The user MUST be in a team with LOCATION_ADMIN role BEFORE you can assign them to a group.

**How:**
1. Go to **Groups** page
2. Find the group you created (e.g., "Brian Solomonic")
3. Click to expand the group OR click **"Assign User"**
4. Select the user from the dropdown
5. Click **Assign**

**What happens:**
- User's `groupId` is set to this group
- User's `locationIds` are automatically updated to include ALL locations in the group
- User can now see their group on the Groups page
- User can create Location Users for their franchise locations

### Step 5: Send Login Credentials

Send the FBC:
- Their username
- Their temporary password
- Link to the portal
- Instructions to verify email and reset password (see FBC_ONBOARDING_GUIDE.md)

---

## **Part 3: Understanding Groups in Detail**

### What Groups Control

| Feature | How Groups Affect It |
|---------|---------------------|
| **Report Data** | Users only see data for locations in their group |
| **Location Selection** | Location pickers only show group locations |
| **Create Users** | Location Admins can only create users within their group |

### Admin vs. Location Admin View

| Action | Admin | Location Admin |
|--------|-------|----------------|
| See all groups | ✅ | ❌ (only their group) |
| Create groups | ✅ | ❌ |
| Edit groups | ✅ | ❌ |
| Delete groups | ✅ | ❌ |
| Assign users to groups | ✅ | ❌ |
| Create Location Users | ✅ | ✅ (only in their group) |

### When a Group is Updated

If you **add or remove locations** from a group:
- All Location Admins assigned to that group automatically have their locations updated
- Location Users keep their individual location assignments (subset of group)

### When a User is Removed from a Group

- Their `groupId` is cleared
- Their `locationIds` are cleared
- They lose access to group features
- They see "Group Access Pending" message

---

## **Part 4: User Management**

### Users Page Overview

The **Users** page shows all users in the system with:
- Username
- Email
- Team
- Status (Active/Disabled)

### Creating a User

1. Click **"Create User"**
2. Fill in:
   - **Username:** Login name (e.g., `jsmith`)
   - **Email:** Must be valid (receives verification)
   - **Temp Password:** Initial password
   - **Team:** Determines their roles/permissions
   - **Locations:** Which locations they can access
3. Click **Create**

### Password Field

- Click the **eye icon** to show/hide the password
- This works on create and reset password dialogs

### Editing a User

- Click **Edit** on a user row
- Modify fields as needed
- Click **Save**

### Deleting a User

- Click **Delete** on a user row
- Confirm the deletion
- User is removed from Cognito and database

### Resetting a Password

- Click **Reset Password** on a user row
- Enter new temporary password
- User will need to log in with new password

---

## **Part 5: How Authentication Works**

### Backend: AWS Cognito

All authentication is handled by **AWS Cognito**:
- User accounts are stored in Cognito User Pool
- Passwords are managed by Cognito
- Email verification is handled by Cognito
- Password reset emails come from Cognito

### User Creation Flow

```
1. Admin creates user in portal
   ↓
2. Portal calls Cognito signUp() API
   ↓
3. Cognito creates user account
   ↓
4. Cognito sends verification email
   ↓
5. User clicks verification link
   ↓
6. User sets password via Reset Password flow
   ↓
7. User can now log in
   ↓
8. On first login, database record is created/updated
```

### Unconfirmed Users

Users who haven't verified their email appear as "Unconfirmed" in:
- The Users page (for admins)
- The Groups page (for Location Admins viewing their group)

Options for unconfirmed users:
- **Resend Verification:** Sends another verification email
- **Delete:** Removes the unverified account

---

## **Part 6: Report Pages**

### % of Scans

**Purpose:** Track rewards card scan rates by location and employee

**Requires:** SCANS role

**Report Types:**
- **Scan Summary:** Scan rate per location
- **Scan Detail:** Scan rate per employee
- **Rolled Up Summary:** Averaged across date range

### Red Flag Reports

**Purpose:** Identify potential theft/fraud

**Requires:** REPORTING role

**Report Types:**
- **Red Flag Transactions:** Rewards IDs used multiple times per day
- **Discount without Rewards ID:** Discounts given without a rewards card

### Rewards Transactions

**Purpose:** Data validation and transaction review

**Requires:** DATA role

**Report Types:**
- **Data Type Check:** Validates transaction data types

### Raw Data / Raw Rewards Data

**Purpose:** Access raw JSON data files from S3

**Requires:** RAW_DATA or RAW_LOYALTY_REPORTING role

---

## **Part 7: Price Portal**

> ⚠️ **NOTE:** Price Portal is currently unfinished. Document what works and what doesn't.

### How Price Portal Works

1. User selects locations
2. User views/edits prices in a table
3. User submits price changes
4. User's portal access is **locked** while changes are processed
5. Admin reviews and approves changes
6. Admin unlocks the user

### Price Users Page (Admin)

**Purpose:** Manage price portal users

**Features:**
- View all users with price portal access
- Lock/unlock users
- View pending price change reports
- Send reports for processing

### Item Mappings Page

**Purpose:** Map menu items to system IDs

Located at: Price Users → Item Mappings

---

## **Part 8: Testing Checklist**

### Test Accounts Needed

| Account | Team | Roles | Group |
|---------|------|-------|-------|
| Admin Test | Admin | (all) | None needed |
| FBC Test | FBC | REPORTING, SCANS, LOCATION_ADMIN | Assign to test group |
| Location User Test | Location User | (basic) | Same group as FBC |

---

### 8.1 Authentication Tests

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| Valid login | Correct credentials | Redirects to Teams | |
| Invalid login | Wrong password | Error message | |
| Password visibility | Click eye icon | Password shows/hides | |
| Password reset | Request reset, enter code | Password updated | |
| Email verification | Create user, check email | Verification email received | |

### 8.2 User Management Tests (Admin)

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| View users | Go to Users page | All users listed | |
| Create user | Fill form, submit | User created, email sent | |
| Edit user | Modify and save | Changes saved | |
| Delete user | Delete and confirm | User removed | |
| Reset password | Reset for existing user | New password works | |

### 8.3 Groups Tests (Admin)

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| View all groups | Go to Groups page | All groups visible | |
| Create group | Fill form with locations | Group created | |
| Edit group | Modify name/locations | Changes saved | |
| Delete group | Delete and confirm | Group removed | |
| Assign user | Assign Location Admin to group | User appears under group | |
| Remove user | Remove from group | User's group access cleared | |

### 8.4 Groups Tests (Location Admin)

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| View only own group | Login as Location Admin | Only their group visible | |
| Cannot create group | Check for Create button | Button not present | |
| Cannot edit group | Check for Edit button | Button not present | |
| Create Location User | Fill form, submit | User created | |
| Location restriction | Check location picker | Only group locations available | |
| Type in fields | Click and type in username/email/password | Can type in all fields | |
| Manage unconfirmed | Resend/delete options | Both work | |

### 8.5 Report Tests

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| % of Scans loads | Navigate to page | Page loads, access granted | |
| Generate Scan Summary | Fill form, process | Data table appears | |
| Generate Scan Detail | Fill form, process | Employee data appears | |
| Red Flag Reports loads | Navigate to page | Page loads, access granted | |
| Generate Red Flag | Set count=3, process | Filtered results | |
| Generate Discount report | Select type, process | Results appear | |
| Export CSV | Click export | File downloads | |

### 8.6 Price Portal Tests

| Test | Steps | Expected | Status/Notes |
|------|-------|----------|--------------|
| Location selection | Select locations, continue | Price table loads | |
| View prices | Check price table | Current prices shown | |
| Edit price | Enter new price | Value accepted | |
| Submit changes | Click Submit | Submission processes | |
| Account lock | After submit | Portal shows locked | |
| Unlock user (Admin) | Unlock from Price Users | Access restored | |

### 8.7 Navigation & Layout

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| Sidebar (Admin) | Login as Admin | All links visible | |
| Sidebar (FBC) | Login as FBC | Limited links (no Users, no Price Users) | |
| Home page | Click Home | Dashboard with Quick Actions | |
| Quick Actions | Check actions shown | Match user's permissions | |
| Mobile responsive | Resize to mobile | Layout adjusts | |

### 8.8 Performance

| Metric | Target | Actual | ✓/✗ |
|--------|--------|--------|-----|
| Page load | < 3 sec | | |
| Report (7 days, 5 locations) | < 10 sec | | |
| Report (30 days, 20 locations) | < 30 sec | | |
| Navigation | < 1 sec | | |

### 8.9 Browser Compatibility

| Browser | Works? | Issues |
|---------|--------|--------|
| Chrome | | |
| Firefox | | |
| Safari | | |
| Edge | | |
| Mobile Chrome | | |
| Mobile Safari | | |

---

## **Part 9: Common Issues & Troubleshooting**

### User Can't Log In

1. Check if email is verified (Users page shows status)
2. Try resending verification email
3. Try resetting password

### Location Admin Can't See Groups Page

1. Verify they're in a team with LOCATION_ADMIN role
2. Verify they've been assigned to a group

### Location Admin Can't Type in Create User Modal

This was a known bug that has been fixed. If it recurs:
1. Check browser console for errors
2. Try refreshing the page
3. Try a different browser

### Report Shows No Data

1. Verify date range has data (try a known date)
2. Verify locations are selected
3. Check if S3 bucket has files for that date range

### User Not Receiving Emails

1. Check spam/junk folder
2. Verify email address is correct
3. Try resending verification
4. Check AWS Cognito logs if persistent

---

## **Part 10: Sign-Off**

| Tester | Date | Sections Tested | Critical Bugs | Approved? |
|--------|------|-----------------|---------------|-----------|
| | | | | |
| | | | | |

**Overall Status:** ☐ Ready for Release  ☐ Needs Fixes  ☐ Major Issues

**Release Blockers:**
1.
2.
3.

**Notes:**

