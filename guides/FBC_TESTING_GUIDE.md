# IT Functionality Testing Guide: FBC User Perspective

This guide is for IT team members to test portal functionality **as an FBC user would experience it**.

**Goal:** Verify everything works correctly and identify UI/UX issues from the FBC perspective.

---

## **Setup: Create a Test FBC Account**

Before testing, create a dummy FBC user:

1. **Create a Test Group:**
   - Go to Groups page (as Admin)
   - Create a group named "IT Test Group"
   - Add 3-5 test locations

2. **Create a Test FBC User:**
   - Go to Users page
   - Create user with:
     - Username: `testfbc`
     - Email: Your email (so you receive verification)
     - Team: FBC (must have REPORTING, SCANS, LOCATION_ADMIN roles)
   - Verify the email
   - Set password

3. **Assign User to Group:**
   - Go to Groups page
   - Assign `testfbc` to "IT Test Group"

4. **Log out and log in as `testfbc`**

---

## **Section 1: Authentication Flow**

### 1.1 Login Page

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does the login page load correctly? | | |
| Is the layout clear and professional? | | |
| Are the username/password fields obvious? | | |
| Does the password eye icon work? | | |
| Is the "Reset Password" link visible and clear? | | |
| Are error messages helpful when login fails? | | |

**UI/Layout Notes:**
-
-

### 1.2 Password Reset Flow

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Is the reset password flow intuitive? | | |
| Does the confirmation code email arrive? | | |
| Are instructions clear at each step? | | |
| Any confusing wording or unclear buttons? | | |

**UI/Layout Notes:**
-
-

---

## **Section 2: Home Page (FBC View)**

Log in as the test FBC user and examine the home page.

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does the page load without errors? | | |
| Does the greeting show the correct username? | | |
| Does the time widget update? | | |
| Are Quick Actions visible? | | |
| Do Quick Actions only show permitted pages? | | |
| Is the layout balanced and professional? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Hero section gradient/colors | | |
| Stats cards (Active Users, Reports, etc.) | | |
| Quick Actions grid | | |
| Recent Activity section | | |
| Overall spacing and alignment | | |

**Notes:**
-
-

---

## **Section 3: Sidebar Navigation (FBC View)**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does sidebar show correct items for FBC? | | |
| Should see: Home, Teams, Groups, Reports section | | |
| Should NOT see: Users, Price Users | | |
| Does collapse/expand work? | | |
| Does "Reports" section expand/collapse? | | |
| Is the active page highlighted? | | |
| Are icons clear and appropriate? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Sidebar width | | |
| Menu item spacing | | |
| Icon choices | | |
| Active state styling | | |
| "Reports" section header | | |

**Notes:**
-
-

---

## **Section 4: Teams Page**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does the page load? | | |
| Does it show the user's team (FBC)? | | |
| Are roles displayed correctly? | | |
| Is the page purpose clear? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Page header | | |
| Team card design | | |
| Role badges | | |
| Overall page feels bare/empty? | | |
| Is there enough information displayed? | | |

**Notes:**
-
-

---

## **Section 5: Groups Page (FBC View)**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Does user see ONLY their assigned group? | | |
| Is "Create Group" button hidden (FBC can't create)? | | |
| Is "Edit" button hidden on group card? | | |
| Is group name and locations displayed? | | |
| Is "Create Location User" button visible? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Group card design | | |
| Location list display | | |
| Button placements | | |
| "Unconfirmed Users" section | | |

**Notes:**
-
-

---

## **Section 6: Create Location User Modal**

Click "Create Location User" on the group card.

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does modal open? | | |
| Can you TYPE in the Username field? | | |
| Can you TYPE in the Email field? | | |
| Can you TYPE in the Password field? | | |
| Does password eye icon work? | | |
| Is Team pre-selected to "Location User"? | | |
| Does location picker show only group locations? | | |
| Can you select/deselect locations? | | |
| Does form submit successfully? | | |
| Does modal close after success? | | |
| Does new user appear in "Unconfirmed Users"? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Modal size and positioning | | |
| Form field labels | | |
| Field spacing | | |
| Location picker design | | |
| Submit button placement | | |
| Error message display | | |

**Notes:**
-
-

---

## **Section 7: % of Scans Page**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Is access granted message shown? | | |
| Does report type dropdown work? | | |
| Shows: Scan Detail, Scan Summary, Rolled Up Summary? | | |
| Does date preset dropdown work? | | |
| Does manual date selection work? | | |
| Can future dates be blocked? | | |
| Does location table show only permitted locations? | | |
| Does clicking a location add it as a chip? | | |
| Does "Add All" work? | | |
| Does "Clear All" work? | | |
| Does "Undo" work? | | |
| Does "Process Data" show loading state? | | |
| Does data table appear after processing? | | |
| Does export/download work? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Page header | | |
| Form layout (left column) | | |
| Location table (right column) | | |
| Selected locations chip display | | |
| Date pickers | | |
| "Process Data" button | | |
| Loading indicator | | |
| Data table design | | |
| Export button | | |

**Notes:**
-
-

---

## **Section 8: Red Flag Reports Page**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Is access granted message shown? | | |
| Does report type dropdown work? | | |
| Shows: Red Flag Transactions, Discount without Rewards ID? | | |
| Does "Min Daily Usage Count" appear for Red Flag type? | | |
| Does it hide for Discount type? | | |
| Do date and location selectors work? | | |
| Does processing work for both report types? | | |
| Does data display correctly? | | |
| Does export work? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Report type selector placement | | |
| "Min Daily Usage Count" field placement | | |
| Form arrangement | | |
| Data table columns | | |
| Should any elements be rearranged? | | |

**Notes:**
-
-

---

## **Section 9: Price Portal (FBC View)**

> Note: Price Portal is unfinished. Document what works and what doesn't.

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does location selection page load? | | |
| Can locations be selected? | | |
| Does "Continue" work? | | |
| Does price table load? | | |
| Does category filter work? | | |
| Can prices be edited? | | |
| Does submit work? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Location selection page | | |
| Price table layout | | |
| Category filter | | |
| Input fields for new prices | | |

**Known Issues / Broken Features:**
-
-

---

## **Section 10: General UI/UX Observations**

### Color Palette

| Element | Current | Issue/Suggestion |
|---------|---------|------------------|
| Primary color | | |
| Backgrounds | | |
| Text colors | | |
| Success/Error states | | |
| Buttons | | |

### Typography

| Element | Current | Issue/Suggestion |
|---------|---------|------------------|
| Headers | | |
| Body text | | |
| Labels | | |
| Readability | | |

### Consistency

| Check | Observation |
|-------|-------------|
| Are buttons styled consistently across pages? | |
| Are form layouts consistent? | |
| Are success/error messages consistent? | |
| Are loading states consistent? | |

### Responsiveness

| Screen Size | Issues Found |
|-------------|--------------|
| Desktop (1920px) | |
| Laptop (1366px) | |
| Tablet (768px) | |
| Mobile (375px) | |

---

## **Section 11: Performance**

| Metric | Target | Actual | Pass? |
|--------|--------|--------|-------|
| Login page load | < 2 sec | | |
| Home page load | < 3 sec | | |
| Report page load | < 3 sec | | |
| Report processing (small) | < 10 sec | | |
| Report processing (large) | < 30 sec | | |
| Page navigation | < 1 sec | | |
| Modal open | Instant | | |

---

## **Testing Summary**

**Tester:** _______________________

**Date:** _______________________

**Pages Tested:**
- [ ] Login / Auth
- [ ] Home Page
- [ ] Sidebar
- [ ] Teams Page
- [ ] Groups Page
- [ ] Create Location User
- [ ] % of Scans
- [ ] Red Flag Reports
- [ ] Price Portal

### Critical Bugs (Blocking)
1.
2.
3.

### High Priority Issues (Should Fix)
1.
2.
3.

### UI/UX Improvements (Nice to Have)
1.
2.
3.

### Overall Assessment

☐ Ready for FBC release
☐ Needs fixes before release
☐ Major issues - not ready

