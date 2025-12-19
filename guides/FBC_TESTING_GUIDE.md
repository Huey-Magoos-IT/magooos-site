# FBC Beta Testing Guide

This guide is for FBC (Franchise Business Consultant) users to test the Huey Magoo's Portal before full rollout.

---

## **Part 1: Getting Started**

### Understanding Your Account

As an FBC, you have been set up with:
- **Team:** FBC
- **Roles:** REPORTING, SCANS, LOCATION_ADMIN
- **Group:** A group containing all YOUR franchise locations

Your roles give you access to:
| Role | What It Unlocks |
|------|-----------------|
| REPORTING | Red Flag Reports page |
| SCANS | % of Scans page |
| LOCATION_ADMIN | Groups page + ability to create Location Users |

### Account Activation Process

**Step 1: Verify Your Email**
1. Check your inbox for an email with subject "Huey Magoos Portal Account - Email Verification Required"
2. Click the "Verify Email" link
3. A confirmation page will appear - you can close it

**Step 2: Set Your Password**
1. Go to the login page
2. Click "Reset Password"
3. Enter your username (provided by IT)
4. Check your email for a confirmation code
5. Enter the code and create your new password
6. You can now log in

---

### ✅ Test: Authentication

| Test | Try This | What Should Happen | ✓/✗ |
|------|----------|-------------------|-----|
| Login | Enter username + password | Redirects to Teams page | |
| Password toggle | Click eye icon on password field | Shows/hides password | |
| Wrong password | Enter incorrect password | Shows error, stays on login | |

---

## **Part 2: Navigation**

After logging in, you'll see the **sidebar** on the left with:

```
Home
Teams
Groups
▼ Reports
   • % of Scans
   • Red Flag Reports
   • Price Portal
```

**Home Page:** Your dashboard with Quick Actions - shortcuts to pages you can access.

**Teams Page:** Shows your team (FBC) and your roles. Just informational.

**Groups Page:** Where you manage Location Users (covered in Part 5).

---

### ✅ Test: Navigation

| Test | Try This | What Should Happen | ✓/✗ |
|------|----------|-------------------|-----|
| Sidebar visible | Look at left side | All menu items listed above are visible | |
| Home page | Click "Home" | Dashboard loads with Quick Actions | |
| Quick Actions | View Quick Actions section | Shows only pages you have access to | |

---

## **Part 3: % of Scans**

### What This Page Does

This page shows your **Scan Rate** - the percentage of transactions where a rewards card was scanned. Use this to:
- Monitor store performance
- Identify employees who need coaching
- Track improvements over time

### Report Types

| Report | What It Shows |
|--------|--------------|
| **Scan Summary** | Scan Rate per LOCATION - compare stores |
| **Scan Detail** | Scan Rate per EMPLOYEE - see individual performance |
| **Rolled Up Summary** | Average performance across your date range |

### How to Generate a Report

1. **Select Report Type:** Click the dropdown under "File Content Type"
2. **Select Dates:** Use a preset (Last 7 Days) OR pick custom dates
3. **Select Locations:** Click locations in the table on the right. They appear as chips.
   - **Add All:** Adds all your locations
   - **Clear All:** Removes all selections
   - **Undo:** Reverts your last action
4. **Click "Process Data":** Wait for the report to generate
5. **View Results:** Data appears in the table below
6. **Export:** Click the export button to download as CSV

---

### ✅ Test: % of Scans

| Test | Try This | What Should Happen | ✓/✗ |
|------|----------|-------------------|-----|
| Page loads | Click "% of Scans" in sidebar | Page loads, shows green "SCANS Access Successful" | |
| Report types | Click dropdown | Shows: Scan Detail, Scan Summary, Rolled Up Summary | |
| Date preset | Select "Last 7 Days" | Start and End dates auto-fill | |
| Add location | Click a location in the table | Appears as a chip in "Selected Locations" | |
| Add All | Click "Add All" button | All your locations added | |
| Clear All | Click "Clear All" | All locations removed | |
| Undo | Make a change, click "Undo" | Previous state restored | |
| Generate report | Select type, dates, 3+ locations, click "Process Data" | Loading shows, then data table appears | |
| Scan Summary | Generate with "Scan Summary" | Shows Location, Total Checks, Scans, Scan Rate | |
| Scan Detail | Generate with "Scan Detail" | Shows Employee breakdown | |
| Export | Click export button | CSV file downloads | |
| No locations | Try to process with no locations | Error message or prompt | |
| No data | Select dates with no data | "No data found" message | |

---

## **Part 4: Red Flag Reports**

### What This Page Does

This page helps you identify **potential theft or misuse** by finding:
1. Rewards accounts used suspiciously often
2. Discounts given without a rewards card

### Report Types

| Report | What It Finds |
|--------|--------------|
| **Red Flag Transactions** | Rewards IDs used multiple times per day (suspicious) |
| **Discount without Rewards ID** | Discounts applied with no rewards card (shouldn't happen) |

### How to Use Red Flag Transactions

1. Select "Red Flag Transactions" as report type
2. Set **"Min Daily Usage Count"** - e.g., `3` means "show me rewards IDs used 3+ times in one day"
3. Select dates and locations
4. Click "Process Data"
5. Review results - these are transactions worth investigating

### How to Use Discount without Rewards ID

1. Select "Discount without Rewards ID"
2. Select dates and locations
3. Click "Process Data"
4. Review results - every row is a discount given without a rewards card attached

---

### ✅ Test: Red Flag Reports

| Test | Try This | What Should Happen | ✓/✗ |
|------|----------|-------------------|-----|
| Page loads | Click "Red Flag Reports" in sidebar | Page loads, shows "REPORTING Access Granted" | |
| Report types | Click dropdown | Shows: Red Flag Transactions, Discount without Rewards ID | |
| Usage count field | Select "Red Flag Transactions" | "Min Daily Usage Count" field appears | |
| Set count | Enter "3" in usage count | Value accepted | |
| Generate Red Flag | Fill form, click "Process Data" | Shows transactions with IDs used 3+ times/day | |
| Generate Discount | Select Discount report, fill form, process | Shows discounts without rewards ID | |
| Employee names | Check Employee column | Names populated where available | |
| Export | Click export button | CSV downloads | |

---

## **Part 5: Groups - Creating Location Users**

### What This Page Does

The **Groups** page lets you create **Location Users** - people who work at your franchise locations and need access to run reports for specific stores.

### Understanding the Hierarchy

```
YOU (FBC / Location Admin)
  └── Your Group (contains your locations)
        └── Location Users YOU create
              └── Can only see locations YOU assign them
```

### What You Can Do

- ✅ View your assigned group
- ✅ See which locations are in your group
- ✅ Create Location Users under your group
- ✅ Assign specific locations to those users
- ✅ Resend verification emails to users you created
- ✅ Delete unconfirmed users you created

### What You CANNOT Do

- ❌ Create or edit groups (Admin only)
- ❌ See other groups
- ❌ Assign locations outside your group

### How to Create a Location User

1. Go to **Groups** page
2. Find your group card
3. Click **"Create Location User"** button
4. Fill out the form:
   - **Username:** Their login name
   - **Email:** Their email address
   - **Temp Password:** Initial password (they'll change it later)
   - **Locations:** Select which of YOUR locations they can access
5. Click **Create/Submit**

### What Happens Next

1. User appears in "Unconfirmed Users" section on your group card
2. They receive a verification email
3. They verify their email and set their password
4. They can now log in and see ONLY the locations you assigned

### Managing Unconfirmed Users

| Action | What It Does |
|--------|-------------|
| **Resend Verification** | Sends another verification email |
| **Delete** | Removes the user (if they haven't verified yet) |

---

### ✅ Test: Groups

| Test | Try This | What Should Happen | ✓/✗ |
|------|----------|-------------------|-----|
| Page loads | Click "Groups" in sidebar | Page loads, shows YOUR group only | |
| Group info | Look at your group card | Shows group name and your locations | |
| Create User button | Look for "Create Location User" | Button is visible on your group | |
| Open modal | Click "Create Location User" | Modal/form opens | |
| Team pre-selected | Check Team field | Should say "Location User" automatically | |
| Enter username | Type a username | Field accepts input (can you type?) | |
| Enter email | Type an email | Field accepts input | |
| Enter password | Type a temp password | Field accepts input | |
| Password toggle | Click eye icon | Password shows/hides | |
| Location picker | View available locations | Only YOUR group's locations shown | |
| Select locations | Click to select 1-2 locations | Locations selected | |
| Create user | Fill everything, click Create | Success message, modal closes | |
| User appears | Check group card | New user in "Unconfirmed Users" section | |
| Resend email | Click "Resend Verification" | Confirmation that email sent | |
| Delete user | Click "Delete" on unconfirmed user | User removed from list | |

---

## **Part 6: Usability Feedback**

### Performance - Is it fast enough?

| Question | Response |
|----------|----------|
| Do pages load in under 3 seconds? | |
| Do reports process in under 30 seconds? | |
| Is navigation between pages smooth? | |

### Usability - Is it easy to use?

| Question | Response |
|----------|----------|
| Was the signup process clear? | |
| Could you find the reports you needed? | |
| Were the report filters intuitive? | |
| Is the data presented in a useful way? | |

### Value - Is it useful for your job?

| Question | Response |
|----------|----------|
| Is the Scan Rate data useful for monitoring stores? | |
| Is the Red Flag report useful for identifying theft? | |
| Would you use this regularly? Why or why not? | |
| What would make this more valuable for you? | |

---

## **Feedback Summary**

**Tester Name:** _______________________

**Date Tested:** _______________________

**Overall Rating:** ☐ Works Great  ☐ Mostly Works  ☐ Needs Work  ☐ Broken

**Top 3 Issues Found:**
1.
2.
3.

**Feature Requests / Suggestions:**


**Would this be useful for your franchisees?** ☐ Yes  ☐ No  ☐ Maybe

**Additional Comments:**

