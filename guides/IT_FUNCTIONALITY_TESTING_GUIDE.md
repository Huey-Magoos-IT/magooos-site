# IT Functionality Testing Guide

This guide is for internal IT team members to test the Huey Magoo's Portal before rollout to FBCs and other users.

---

## **Testing Objectives**

1. **Functionality** - Does each feature work as expected?
2. **Performance** - Are load times acceptable? Any lag or freezing?
3. **UI/UX** - Is the interface intuitive? Any visual bugs or formatting issues?
4. **Edge Cases** - What happens with unusual inputs or empty data?
5. **Error Handling** - Are errors displayed clearly? Does the app recover gracefully?

---

## **Test Accounts Needed**

Create test accounts with different permission levels to test role-based access:

| Account Type | Team/Roles | Purpose |
|--------------|------------|---------|
| Admin | Admin team (full access) | Test all features |
| FBC User | FBC team (REPORTING, SCANS, LOCATION_ADMIN) | Test FBC experience |
| Location User | Location User team | Test restricted access |
| New User | Unverified account | Test onboarding flow |

---

## **Test Categories**

### **1. Authentication & Onboarding**

| Test | Steps | Expected Result | Pass/Fail | Notes |
|------|-------|-----------------|-----------|-------|
| Login with valid credentials | Enter username/password, click Login | Redirects to home/teams page | | |
| Login with invalid credentials | Enter wrong password | Shows error message, stays on login | | |
| Password visibility toggle | Click eye icon on password field | Password shows/hides | | |
| Reset password flow | Click "Reset Password", enter username | Receives email with code | | |
| Password reset completion | Enter code and new password | Password updated, can login | | |
| Email verification (new user) | Click verification link in email | Email verified, confirmation shown | | |
| Session timeout | Leave idle for extended period | Redirects to login when session expires | | |

---

### **2. Navigation & Layout**

| Test | Steps | Expected Result | Pass/Fail | Notes |
|------|-------|-----------------|-----------|-------|
| Sidebar loads correctly | Login and view sidebar | All permitted links visible | | |
| Sidebar collapses/expands | Click collapse button | Sidebar toggles smoothly | | |
| Home page loads | Click Home in sidebar | Dashboard displays with Quick Actions | | |
| Quick Actions match permissions | View Quick Actions as different user types | Only accessible links shown | | |
| Mobile responsiveness | Resize browser to mobile width | Layout adjusts, no horizontal scroll | | |
| Dark/Light mode toggle | Toggle theme (if available) | Colors switch correctly | | |
| Page transitions | Navigate between pages | Smooth transitions, no flashing | | |

---

### **3. Teams Page**

| Test | Steps | Expected Result | Pass/Fail | Notes |
|------|-------|-----------------|-----------|-------|
| Teams page loads | Navigate to Teams | Shows user's team and roles | | |
| Team info displays correctly | View team card | Team name, roles listed | | |

---

### **4. Groups Page (Admin)**

| Test | Steps | Expected Result | Pass/Fail | Notes |
|------|-------|-----------------|-----------|-------|
| Groups list loads | Navigate to Groups as Admin | All groups displayed | | |
| Create new group | Click Create, fill form, submit | Group created, appears in list | | |
| Edit group | Click Edit on existing group | Can modify name, description, locations | | |
| Delete group | Click Delete, confirm | Group removed from list | | |
| Assign user to group | Select user, assign to group | User appears under group | | |
| Remove user from group | Remove user from group | User's group access cleared | | |

---

### **5. Groups Page (Location Admin)**

| Test | Steps | Expected Result | Pass/Fail | Notes |
|------|-------|-----------------|-----------|-------|
| View assigned group only | Login as Location Admin | Only their group visible | | |
| Create Location User | Click Create User, fill form | User created, appears in unconfirmed list | | |
| Location selection restricted | Try to select locations | Only group's locations available | | |
| Resend verification email | Click resend for unconfirmed user | Email sent successfully | | |
| Delete unconfirmed user | Delete pending user | User removed from list | | |

---

### **6. % of Scans Report**

| Test | Steps | Expected Result | Pass/Fail | Notes |
|------|-------|-----------------|-----------|-------|
| Page loads | Navigate to % of Scans | Form and location table display | | |
| Date preset selection | Select "Last 7 Days" | Start/End dates auto-populate | | |
| Custom date range | Manually select dates | Dates update correctly | | |
| Location selection | Click locations in table | Locations appear as chips | | |
| Add All locations | Click "Add All" | All permitted locations selected | | |
| Clear All locations | Click "Clear All" | All locations removed | | |
| Undo action | Click "Undo" after action | Previous state restored | | |
| **Scan Summary** report | Select type, dates, locations, Process | Summary data displays in table | | |
| **Scan Detail** report | Select type, dates, locations, Process | Detail data displays in table | | |
| **Rolled Up Summary** report | Select type, dates, locations, Process | Aggregated data displays | | |
| Export to CSV | Click export button | CSV downloads with correct data | | |
| Empty results | Select dates with no data | "No data found" message shown | | |
| Loading state | Click Process | Loading indicator appears | | |
| Large date range performance | Select 30+ days, multiple locations | Completes in reasonable time (<30s) | | |

---

### **7. Red Flag Reports**

| Test | Steps | Expected Result | Pass/Fail | Notes |
|------|-------|-----------------|-----------|-------|
| Page loads | Navigate to Red Flag Reports | Form displays correctly | | |
| **Red Flag Transactions** report | Select type, dates, locations, Process | Transaction data displays | | |
| Min Daily Usage Count filter | Set count to 3, Process | Only shows IDs used 3+ times/day | | |
| **Discount without Rewards ID** | Select type, dates, locations, Process | Discount anomalies display | | |
| Employee name enhancement | Process report | Employee names populated where available | | |
| Export to CSV | Click export | CSV downloads correctly | | |

---

### **8. Price Portal**

| Test | Steps | Expected Result | Pass/Fail | Notes |
|------|-------|-----------------|-----------|-------|
| Location selection page | Navigate to Price Portal | Location picker displays | | |
| Select locations and continue | Pick locations, click Continue | Price table loads | | |
| Category filter | Select category dropdown | Table filters to category | | |
| Edit price | Type new price in 'New' column | Value updates | | |
| Submit price changes | Click Submit | Changes submitted, confirmation shown | | |
| Account lock after submission | Submit changes | Portal shows "In Progress" lock | | |
| Validation errors | Enter invalid price (letters) | Error message shown | | |

---

### **9. Users Page (Admin Only)**

| Test | Steps | Expected Result | Pass/Fail | Notes |
|------|-------|-----------------|-----------|-------|
| Users list loads | Navigate to Users | All users displayed | | |
| Create new user | Click Create, fill form | User created | | |
| Password visibility toggle | Click eye icon | Password shows/hides | | |
| Edit user | Click Edit on user | Can modify details | | |
| Delete user | Click Delete, confirm | User removed | | |
| Reset user password | Click reset password | Reset email sent | | |

---

### **10. Performance Benchmarks**

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Initial page load | < 3 seconds | | |
| Report processing (7 days, 5 locations) | < 10 seconds | | |
| Report processing (30 days, 20 locations) | < 30 seconds | | |
| CSV export | < 5 seconds | | |
| Navigation between pages | < 1 second | | |
| Modal open/close | Instant | | |

---

### **11. Browser Compatibility**

Test in each browser:

| Browser | Version | Works? | Notes |
|---------|---------|--------|-------|
| Chrome | Latest | | |
| Firefox | Latest | | |
| Safari | Latest | | |
| Edge | Latest | | |
| Mobile Safari (iOS) | Latest | | |
| Mobile Chrome (Android) | Latest | | |

---

### **12. Error Scenarios**

| Test | Steps | Expected Result | Pass/Fail | Notes |
|------|-------|-----------------|-----------|-------|
| Network disconnection | Disable network, try action | Error message, no crash | | |
| Invalid API response | (Dev tools: block API) | Error handled gracefully | | |
| Session expired mid-action | Let session expire, try action | Redirects to login | | |
| Empty required fields | Submit form with blanks | Validation errors shown | | |

---

## **Bug Reporting Template**

When you find an issue, document it with:

```
**Bug Title:** [Brief description]

**Severity:** Critical / High / Medium / Low

**Page/Feature:** [Where it occurred]

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:** [What should happen]

**Actual Result:** [What actually happened]

**Browser/Device:** [Chrome 120, Windows 11]

**Screenshots:** [Attach if applicable]

**Console Errors:** [Check browser dev tools, F12 > Console]
```

---

## **Severity Definitions**

| Severity | Definition | Examples |
|----------|------------|----------|
| **Critical** | App unusable, data loss, security issue | Can't login, data not saving, passwords exposed |
| **High** | Major feature broken | Report won't generate, can't create users |
| **Medium** | Feature works but has issues | Slow performance, formatting problems |
| **Low** | Minor cosmetic issues | Typos, alignment off by a few pixels |

---

## **Testing Checklist Summary**

- [ ] All test accounts created
- [ ] Authentication flows tested
- [ ] Navigation and layout verified
- [ ] All report types generate correctly
- [ ] Export functionality works
- [ ] Performance is acceptable
- [ ] Tested on multiple browsers
- [ ] Error scenarios handled
- [ ] All bugs documented

---

## **Sign-Off**

| Tester | Date | Areas Tested | Bugs Found | Approved for Release? |
|--------|------|--------------|------------|----------------------|
| | | | | |
| | | | | |

