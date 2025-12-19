# IT Functionality Testing Guide: Administrator Perspective

This guide is for IT team members to test portal functionality **as an Administrator**.

**Goal:** Verify all admin features work correctly and identify UI/UX issues across the entire platform.

---

## **Prerequisites**

- Admin account credentials
- Access to the portal
- Time to test all sections thoroughly

---

## **Section 1: Authentication (Admin)**

### 1.1 Login Page

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does login page load? | | |
| Is layout professional? | | |
| Does password eye icon work? | | |
| Does login redirect to correct page? | | |
| Are error messages clear? | | |

**UI/Layout Notes:**
-
-

### 1.2 Password Reset (Test with a test account)

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does reset flow work? | | |
| Is the flow intuitive? | | |
| Do emails arrive? | | |

---

## **Section 2: Home Page (Admin View)**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Is greeting correct (time + username)? | | |
| Does clock widget work? | | |
| Are Quick Actions visible? | | |
| Do Quick Actions show all admin options? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Hero section | | |
| Stats cards | | |
| Quick Actions grid | | |
| Recent Activity | | |
| Weekly stats | | |
| Overall balance/spacing | | |

**Notes:**
-
-

---

## **Section 3: Sidebar (Admin View)**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Shows: Home, Users, Teams, Groups, Price Users? | | |
| Shows all Reports items? | | |
| Does collapse/expand work? | | |
| Is active page highlighted? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Overall sidebar design | | |
| Menu item styling | | |
| Icons | | |
| Section headers | | |

**Notes:**
-
-

---

## **Section 4: Users Page**

### 4.1 User List

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Are all users listed? | | |
| Is user info displayed (username, email, team)? | | |
| Is the list searchable/filterable? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Page header | | |
| User cards/rows | | |
| Information density | | |
| Action buttons placement | | |

### 4.2 Create User Modal

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does modal open? | | |
| Can you type in all fields? | | |
| Does password eye icon work? | | |
| Does team dropdown work? | | |
| Does location selection work? | | |
| Does form validate required fields? | | |
| Does submit create user? | | |
| Is verification email sent? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Modal design | | |
| Form layout | | |
| Field labels | | |
| Error messages | | |

### 4.3 Edit User

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Can you edit user details? | | |
| Do changes save? | | |

### 4.4 Delete User

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does delete prompt for confirmation? | | |
| Does delete actually remove user? | | |

### 4.5 Reset Password

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does reset password dialog open? | | |
| Does password eye icon work? | | |
| Does reset work? | | |

**Notes:**
-
-

---

## **Section 5: Teams Page**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Are teams displayed? | | |
| Are roles shown for each team? | | |
| Is the page informative enough? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Page feels bare/empty? | | |
| Team card design | | |
| Role badges | | |
| Should there be more functionality here? | | |

**Notes:**
-
-

---

## **Section 6: Groups Page (Admin View)**

### 6.1 Groups List

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Are ALL groups visible? | | |
| Is each group's info displayed? | | |
| Can groups be expanded to see details? | | |

### 6.2 Create Group

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Is "Create Group" button visible? | | |
| Does modal/form open? | | |
| Can you enter name and description? | | |
| Does location picker work? | | |
| Does form submit create group? | | |

### 6.3 Edit Group

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Can you edit group name? | | |
| Can you edit description? | | |
| Can you add/remove locations? | | |
| Do changes save? | | |

### 6.4 Delete Group

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does delete prompt confirmation? | | |
| Does delete remove group? | | |
| What happens to assigned users? | | |

### 6.5 Assign User to Group

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Is "Assign User" option visible? | | |
| Does user dropdown show only eligible users? | | |
| (Users must have LOCATION_ADMIN role) | | |
| Does assignment work? | | |
| Does user appear under group after? | | |

### 6.6 Remove User from Group

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Can you remove a user from group? | | |
| Is their group access cleared? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Group card design | | |
| Assigned users display | | |
| Location list display | | |
| Action buttons | | |
| Create/Edit forms | | |

**Notes:**
-
-

---

## **Section 7: % of Scans Page**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Access granted for admin? | | |
| All report types available? | | |
| Date selection works? | | |
| Location selection works? | | |
| Processing works? | | |
| Export works? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Form layout | | |
| Data table | | |
| Controls arrangement | | |

**Notes:**
-
-

---

## **Section 8: Red Flag Reports Page**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Both report types work? | | |
| Min Daily Usage Count filter works? | | |
| Processing and export work? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Form arrangement | | |
| Should elements be rearranged? | | |
| Data table layout | | |

**Notes:**
-
-

---

## **Section 9: Rewards Transactions (Data Page)**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Is "Data Type Check" report available? | | |
| Does processing work? | | |
| Does export work? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Page design | | |
| Form layout | | |

**Notes:**
-
-

---

## **Section 10: Raw Data Page**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Are files listed? | | |
| Can files be downloaded? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| File list design | | |
| Download functionality | | |

**Notes:**
-
-

---

## **Section 11: Raw Rewards Data Page**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Can files be selected? | | |
| Does JSON viewer work? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| File selector | | |
| JSON viewer | | |

**Notes:**
-
-

---

## **Section 12: Price Portal**

> ⚠️ **Note:** Price Portal is unfinished. Document what works and what's broken.

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Location selection works? | | |
| Price table loads? | | |
| Category filter works? | | |
| Price editing works? | | |
| Submit works? | | |
| Account lock works? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Location selection | | |
| Price table | | |
| Submit flow | | |

**Known Issues / Broken Features:**
-
-

---

## **Section 13: Price Users Page**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Are price users listed? | | |
| Does lock/unlock work? | | |
| Are pending reports shown? | | |
| Does send report work? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| User list | | |
| Lock/unlock controls | | |
| Reports section | | |

**Notes:**
-
-

---

## **Section 14: Item Mappings Page**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Are mappings displayed? | | |
| Can mappings be edited? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Table design | | |
| Edit functionality | | |

**Notes:**
-
-

---

## **Section 15: Settings Page**

| Check | Observation | Issues Found |
|-------|-------------|--------------|
| Does page load? | | |
| Is user info displayed? | | |
| Is info accurate? | | |

**UI/Layout Observations:**

| Element | Looks Good? | Suggested Changes |
|---------|-------------|-------------------|
| Page layout | | |
| Information display | | |
| Should there be more settings? | | |

**Notes:**
-
-

---

## **Section 16: General UI/UX Review**

### Color Palette

| Element | Current | Issue/Suggestion |
|---------|---------|------------------|
| Primary brand color | | |
| Secondary colors | | |
| Background colors | | |
| Text colors | | |
| Success/warning/error states | | |
| Button colors | | |

### Typography

| Element | Observation | Issue/Suggestion |
|---------|-------------|------------------|
| Page headers | | |
| Section headers | | |
| Body text | | |
| Labels | | |
| Button text | | |
| Overall readability | | |

### Consistency Across Pages

| Check | Consistent? | Notes |
|-------|-------------|-------|
| Button styles | | |
| Form layouts | | |
| Card designs | | |
| Table styles | | |
| Modal designs | | |
| Loading indicators | | |
| Error messages | | |
| Success messages | | |

### Page-by-Page Balance

| Page | Layout Balanced? | Feels Empty? | Too Cluttered? | Notes |
|------|------------------|--------------|----------------|-------|
| Home | | | | |
| Users | | | | |
| Teams | | | | |
| Groups | | | | |
| % of Scans | | | | |
| Red Flag Reports | | | | |
| Price Portal | | | | |
| Settings | | | | |

---

## **Section 17: Responsiveness**

| Screen Size | Issues Found |
|-------------|--------------|
| Desktop (1920px) | |
| Desktop (1440px) | |
| Laptop (1366px) | |
| Tablet (768px) | |
| Mobile (375px) | |

---

## **Section 18: Browser Compatibility**

| Browser | Version | Works? | Issues |
|---------|---------|--------|--------|
| Chrome | Latest | | |
| Firefox | Latest | | |
| Safari | Latest | | |
| Edge | Latest | | |

---

## **Section 19: Performance**

| Metric | Target | Actual | Pass? |
|--------|--------|--------|-------|
| Login | < 2 sec | | |
| Page loads | < 3 sec | | |
| Report processing (small) | < 10 sec | | |
| Report processing (large) | < 30 sec | | |
| Navigation | < 1 sec | | |
| Modal open | Instant | | |
| User creation | < 3 sec | | |
| Group creation | < 2 sec | | |

---

## **Testing Summary**

**Tester:** _______________________

**Date:** _______________________

**Pages Tested:**
- [ ] Login / Auth
- [ ] Home Page
- [ ] Sidebar
- [ ] Users Page (all CRUD)
- [ ] Teams Page
- [ ] Groups Page (all CRUD + assignments)
- [ ] % of Scans
- [ ] Red Flag Reports
- [ ] Rewards Transactions
- [ ] Raw Data
- [ ] Raw Rewards Data
- [ ] Price Portal
- [ ] Price Users
- [ ] Item Mappings
- [ ] Settings

### Critical Bugs (Blocking Release)
1.
2.
3.

### High Priority Issues (Should Fix)
1.
2.
3.

### UI/UX Improvements (Recommended)
1.
2.
3.

### Low Priority / Nice to Have
1.
2.
3.

### Overall Assessment

☐ Ready for release
☐ Needs fixes before release
☐ Major issues - not ready

**Additional Notes:**


