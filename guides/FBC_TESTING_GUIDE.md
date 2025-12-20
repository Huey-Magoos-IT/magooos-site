# FBC Testing Guide

This guide is for IT to test the portal from an FBC's perspective. Complete the **Administrator Testing Guide** first - that's where the test FBC account is created.

---

## **What You're Testing For**

Now you're looking at the portal through an FBC's eyes. As you go through each page:

- **Does it make sense?** Would an FBC understand what they're looking at without training?
- **Is the layout appropriate?** Does the Groups page look right for someone managing their locations?
- **Is anything confusing?** Are buttons labeled clearly? Is navigation intuitive?
- **Does the data presentation work?** Are the reports easy to read and useful?
- **How does it feel?** Professional? Clunky? Clean? Overwhelming?

Remember: FBCs won't have Admin access. They see a limited view. Does that limited view feel complete, or does it feel like something's missing?

---

## **Part 1: Account Activation**

After creating the test FBC account in the Admin guide, switch to testing as that user.

### Check the Verification Email

1. Check the inbox for the email used when creating `testfbc`
2. Look for an email with subject "Huey Magoos Portal Account - Email Verification Required"
3. Click the verification link in the email
4. A confirmation page should appear

### Set Your Password

1. Go to the login page
2. Click **"Reset Password"**
3. Enter the username: `testfbc`
4. Check email for a confirmation code
5. Enter the code and create a new password
6. Log in with the new password

After logging in, you should land on the Teams page.

---

## **Part 2: What FBCs See**

As an FBC, the sidebar shows:

```
Home
Teams
Groups
Settings
▼ Reports
   • % of Scans
   • Red Flag Reports
```

**What they DON'T see:**
- Users page (Admin only)
- Price Users (Admin only)
- Rewards Transactions, Raw Data, Raw Rewards Data (different roles)

### Home Page

The Home page shows Quick Actions - shortcuts to pages the user has access to. As an FBC, they should see quick actions for:
- % of Scans
- Red Flag Reports
- Groups

### Teams Page

Shows the user's assigned team (FBC) and their roles. Just informational, no actions to take.

---

## **Part 3: % of Scans**

This is the main report page for FBCs to monitor scan rates.

### What This Page Does

Shows the **Scan Rate** - percentage of transactions where a rewards card was scanned. FBCs use this to:
- Monitor store performance
- Identify employees who need coaching
- Track improvements over time

### Report Types

| Report | What It Shows |
|--------|--------------|
| **Scan Summary** | Scan Rate per LOCATION - compare stores |
| **Scan Detail** | Scan Rate per EMPLOYEE - individual performance |
| **Rolled Up Summary** | Average performance across the date range |

### How to Generate a Report

1. **Select Report Type:** Click the dropdown under "File Content Type"
2. **Select Dates:** Use a preset (Last 7 Days) or pick custom dates
3. **Select Locations:** Click locations in the table. They appear as chips.
   - **Add All:** Adds all locations
   - **Clear All:** Removes all selections
   - **Undo:** Reverts your last action
4. **Click "Process Data"**
5. **View Results:** Data appears in the table below
6. **Export:** Download as CSV

### Location Restriction

The location picker should ONLY show locations in the FBC's group - not all system locations.

---

## **Part 4: Red Flag Reports**

This page helps identify potential theft or misuse.

### Report Types

| Report | What It Finds |
|--------|--------------|
| **Red Flag Transactions** | Rewards IDs used multiple times per day (suspicious activity) |
| **Discount without Rewards ID** | Discounts applied with no rewards card (shouldn't happen) |

### How to Use Red Flag Transactions

1. Select "Red Flag Transactions"
2. Set **"Min Daily Usage Count"** - e.g., `3` means "show rewards IDs used 3+ times in one day"
3. Select dates and locations
4. Click "Process Data"
5. Review results - these are transactions worth investigating

### How to Use Discount without Rewards ID

1. Select "Discount without Rewards ID"
2. Select dates and locations
3. Click "Process Data"
4. Review results - every row is a discount given without a rewards card

---

## **Part 5: Groups - Creating Location Users**

The Groups page is where FBCs create accounts for people at their franchise locations.

### What FBCs See

FBCs only see THEIR group - not all groups in the system. The group card shows:
- Group name
- Locations in the group
- Users assigned to the group
- "Create Location User" button

### What FBCs Can Do

- View their assigned group
- See which locations are in their group
- Create Location Users
- Assign specific locations to those users
- Resend verification emails
- Delete unconfirmed users they created

### What FBCs CANNOT Do

- Create or edit groups
- See other groups
- Assign locations outside their group

### Creating a Location User

1. Go to **Groups** page
2. Find your group card
3. Click **"Create Location User"**
4. Fill out the form:
   - **Username:** Their login name
   - **Email:** Their email address
   - **Temp Password:** Initial password
   - **Locations:** Select which locations they can access (subset of group)
5. Click **Create**

### What Happens

1. User appears in "Unconfirmed Users" section
2. They receive a verification email
3. They verify and set their password
4. They can log in and see only their assigned locations

### Managing Unconfirmed Users

- **Resend Verification:** Sends another email
- **Delete:** Removes the unverified user
