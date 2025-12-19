# Administrator Testing & Training Guide

This guide is for IT to understand and test the Huey Magoo's Portal from an Admin perspective. This guide is completed FIRST, then continue with the FBC Testing Guide.

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
| **Group** | A collection of locations | "IT Test Group" contains selected franchise locations |
| **User** | An individual person with a login | testfbc@hueymagoos.com |

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

## **Part 2: Setting Up a Test FBC Account (End-to-End)**

This walks through the complete process to onboard an FBC. You will create a test FBC account that will be used in the FBC Testing Guide.

### Step 1: Ensure FBC Team Exists

The FBC team should already exist with these roles:
- REPORTING
- SCANS
- LOCATION_ADMIN

**To verify:**
1. Go to **Teams** page
2. Look for "FBC" team
3. Confirm it has the three roles above

If it doesn't exist, create it with those roles.

### Step 2: Create a Group for the Test FBC

**Why:** Groups bundle locations together. Each FBC manages different franchise locations.

**How:**
1. Go to **Groups** page
2. Click **"Create Group"**
3. Enter:
   - **Name:** "IT Test Group"
   - **Description:** "Test group for IT functionality testing"
   - **Locations:** Select 5-10 locations for testing
4. Click **Save**

### Step 3: Create the Test FBC User Account

**How:**
1. Go to **Users** page
2. Click **"Create User"**
3. Enter:
   - **Username:** `testfbc`
   - **Email:** Use a real email you can access for testing
   - **Temp Password:** Generate one (e.g., `TestPass123!`)
   - **Team:** Select "FBC"
   - **Locations:** Select the same locations as the group
4. Click **Create**

**What happens:**
- User is created in AWS Cognito
- Verification email is sent to the email address
- User appears in Users list

### Step 4: Assign the User to Their Group

⚠️ **IMPORTANT:** The user MUST be in a team with LOCATION_ADMIN role BEFORE you can assign them to a group.

**How:**
1. Go to **Groups** page
2. Find the group you created ("IT Test Group")
3. Click to expand the group OR click **"Assign User"**
4. Select `testfbc` from the dropdown
5. Click **Assign**

**What happens:**
- User's `groupId` is set to this group
- User's `locationIds` are automatically updated to include ALL locations in the group
- User can now see their group on the Groups page
- User can create Location Users for locations in their group

### Step 5: Continue to FBC Testing Guide

The test FBC account is now created. Continue with **FBC_TESTING_GUIDE.md** to:
- Verify the email was received
- Complete the login flow
- Test % of Scans reports
- Test Red Flag Reports
- Test creating Location Users from the FBC perspective

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

## **Part 6: Report Pages Overview**

> **NOTE:** The actual report testing happens in the FBC Testing Guide using the test FBC account. This section is just an overview.

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

> ⚠️ **NOTE:** Price Portal is currently unfinished.

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

## **Part 8: Common Issues & Troubleshooting**

### User Can't Log In

1. Check if email is verified (Users page shows status)
2. Try resending verification email
3. Try resetting password

### Location Admin Can't See Groups Page

1. Verify they're in a team with LOCATION_ADMIN role
2. Verify they've been assigned to a group

### Report Shows No Data

1. Verify date range has data (try a known date)
2. Verify locations are selected
3. Check if S3 bucket has files for that date range

### User Not Receiving Emails

1. Check spam/junk folder
2. Verify email address is correct
3. Try resending verification
4. Check AWS Cognito logs if persistent
