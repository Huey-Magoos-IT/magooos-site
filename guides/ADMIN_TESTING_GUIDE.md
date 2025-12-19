# Administrator Functionality Testing Guide

This guide is for IT administrators to comprehensively test all portal functionality before rollout.

---

## **Test Accounts Required**

| Account Type | Team/Roles | Purpose |
|--------------|------------|---------|
| Admin | Admin team (full access) | Test all admin features |
| FBC User | FBC team (REPORTING, SCANS, LOCATION_ADMIN) | Test FBC experience |
| Location User | Location User team | Test restricted access |
| Price Admin | PRICE_ADMIN role | Test price features |

---

## **Bug Reporting Template**

```
**Bug Title:** [Brief description]
**Severity:** Critical / High / Medium / Low
**Page:** [Where it occurred]
**Steps to Reproduce:**
1.
2.
3.
**Expected:** [What should happen]
**Actual:** [What happened]
**Browser:** [Chrome/Firefox/Safari/Edge + version]
**Screenshots:** [Attach if applicable]
```

**Severity Guide:**
- **Critical:** Can't use app, data loss, security issue
- **High:** Major feature broken
- **Medium:** Feature works but has problems
- **Low:** Minor visual/cosmetic issues

---

## **Section 1: Authentication**

### 1.1 Login Flow
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Valid login | Enter correct credentials, click Login | Redirects to Teams page | | |
| Invalid password | Enter wrong password | Error message, stays on login | | |
| Invalid username | Enter nonexistent username | Error message | | |
| Empty fields | Click Login with empty fields | Validation error | | |
| Password visibility | Click eye icon | Password shows/hides | | |

### 1.2 Password Reset
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Request reset | Click Reset Password, enter username | Code email sent | | |
| Valid code | Enter correct code + new password | Password updated | | |
| Invalid code | Enter wrong code | Error message | | |
| Password requirements | Try weak password | Validation error | | |

### 1.3 New User Verification
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Verification email | Create new user | Email received | | |
| Click verify link | Click link in email | Email verified | | |
| Resend verification | Click resend button | New email sent | | |

---

## **Section 2: Navigation & Layout**

### 2.1 Sidebar (Admin View)
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| All links visible | Login as Admin | Home, Users, Teams, Groups, Price Users, all Reports | | |
| Collapse/expand | Click collapse button | Sidebar toggles smoothly | | |
| Reports section | Click chevron | Expands/collapses sub-items | | |
| Active state | Click link | Current page highlighted | | |

### 2.2 Sidebar (FBC View)
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Limited links | Login as FBC | NO Users, NO Price Users visible | | |
| Groups visible | Check sidebar | Groups link shows | | |
| Reports visible | Check Reports section | % of Scans, Red Flag Reports, Price Portal | | |

### 2.3 Home Page
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Page loads | Click Home | Dashboard displays | | |
| Greeting | Check greeting | Time-appropriate (Morning/Afternoon/Evening) | | |
| Username | Check greeting | Shows logged-in user's name | | |
| Quick Actions | View Quick Actions | Only accessible pages shown | | |
| Clock | Check time widget | Shows current time, updates | | |

### 2.4 Responsive Design
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Desktop (1920px) | View on desktop | Layout correct | | |
| Tablet (768px) | Resize to tablet | Layout adjusts | | |
| Mobile (375px) | Resize to mobile | Sidebar collapsible, content readable | | |

---

## **Section 3: Users Page (Admin Only)**

### 3.1 User List
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Page loads | Navigate to Users | All users displayed | | |
| User info | Check user cards | Shows username, email, team, status | | |
| Search/filter | Use search (if available) | Filters user list | | |

### 3.2 Create User
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Open modal | Click Create User | Modal opens | | |
| Enter username | Type username | Field accepts input | | |
| Enter email | Type email | Field accepts input | | |
| Enter password | Type temp password | Field accepts input | | |
| Password visibility | Click eye icon | Password shows/hides | | |
| Select team | Choose team from dropdown | Team selected | | |
| Select locations | Add locations | Locations appear as chips | | |
| Submit valid form | Fill all fields, submit | User created, appears in list | | |
| Submit empty form | Submit without data | Validation errors shown | | |

### 3.3 Edit User
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Open edit | Click Edit on user | Edit form opens | | |
| Modify fields | Change user details | Fields editable | | |
| Save changes | Click Save | Changes saved | | |

### 3.4 Delete User
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Delete user | Click Delete, confirm | User removed from list | | |
| Cancel delete | Click Delete, cancel | User NOT removed | | |

### 3.5 Reset Password
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Reset password | Click reset for user | Password reset initiated | | |
| Password visibility | Click eye icon in reset dialog | Password shows/hides | | |

---

## **Section 4: Teams Page**

### 4.1 View Teams
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Page loads | Navigate to Teams | Teams list displays | | |
| Team info | Check team cards | Shows team name, roles | | |
| Role badges | View role badges | Roles displayed correctly | | |

---

## **Section 5: Groups Page**

### 5.1 Admin View
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| All groups visible | Login as Admin | All groups shown | | |
| Create group | Click Create Group | Modal opens | | |
| Enter name | Type group name | Field accepts input | | |
| Enter description | Type description | Field accepts input | | |
| Select locations | Add locations to group | Locations added | | |
| Save group | Click Save | Group created, appears in list | | |
| Edit group | Click Edit | Can modify group details | | |
| Delete group | Click Delete, confirm | Group removed | | |
| Assign user | Assign LocationAdmin to group | User appears under group | | |
| Remove user | Remove user from group | User removed, access cleared | | |

### 5.2 Location Admin View
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Single group | Login as LocationAdmin | Only their group visible | | |
| No create button | Check page | Cannot create new groups | | |
| No edit button | Check group card | Cannot edit group | | |
| Create Location User | Click Create Location User | Modal opens | | |
| Team pre-selected | Check Team field | "Location User" auto-selected | | |
| Locations restricted | Check location picker | Only group's locations available | | |
| Create user | Fill form, submit | User created successfully | | |
| Type in fields | Click into username, email, password | Can type in all fields | | |
| Unconfirmed users | Create user | Appears in unconfirmed section | | |
| Resend verification | Click Resend | Email sent | | |
| Delete unconfirmed | Click Delete | User removed | | |

### 5.3 No Group Assigned
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Access without group | Login as LocationAdmin without group | "Group Access Pending" message | | |

---

## **Section 6: % of Scans Report**

### 6.1 Page Access
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Page loads | Navigate to % of Scans | Page displays without error | | |
| Access check | View access banner | "SCANS Access Successful" shown | | |
| Denied (no role) | Login without SCANS role | Access denied message | | |

### 6.2 Report Type
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Dropdown works | Click File Content Type | Shows 3 options | | |
| Scan Detail | Select Scan Detail | Option selected | | |
| Scan Summary | Select Scan Summary | Option selected | | |
| Rolled Up Summary | Select Rolled Up Summary | Option selected | | |

### 6.3 Date Selection
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Preset dropdown | Click Date Range Preset | Shows preset options | | |
| Select preset | Choose "Last 7 Days" | Dates auto-populate | | |
| Manual start date | Pick start date | Date updates, preset clears | | |
| Manual end date | Pick end date | Date updates | | |
| Future date blocked | Try to select tomorrow | Not selectable | | |
| Start after end | Try invalid range | Validation or auto-correct | | |

### 6.4 Location Selection
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Location table | View table | Shows locations user can access | | |
| Add location | Click location row | Added to Selected Locations | | |
| Remove location | Click X on chip | Location removed | | |
| Add All | Click Add All | All locations added | | |
| Clear All | Click Clear All | All locations removed | | |
| Undo | Click Undo after action | Previous state restored | | |

### 6.5 Process Reports
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Scan Summary | Select type, dates, locations | Report generates, shows table | | |
| Scan Detail | Select type, dates, locations | Report generates with employee data | | |
| Rolled Up Summary | Select type, dates, locations | Aggregated data shows | | |
| Loading state | Click Process | Loading indicator visible | | |
| Empty results | Select dates with no data | "No data" message | | |
| Export CSV | Click export button | CSV downloads correctly | | |

### 6.6 Performance
| Test | Metric | Target | Actual | ✓/✗ |
|------|--------|--------|--------|-----|
| 7 days, 5 locations | Load time | < 10 sec | | |
| 30 days, 20 locations | Load time | < 30 sec | | |

---

## **Section 7: Red Flag Reports**

### 7.1 Page Access
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Page loads | Navigate to Red Flag Reports | Page displays | | |
| Access check | View access banner | "REPORTING Access Granted" | | |

### 7.2 Red Flag Transactions
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Select report type | Choose Red Flag Transactions | Selected | | |
| Usage count field | Check form | "Min Daily Usage Count" appears | | |
| Set count to 3 | Enter 3 | Value accepted | | |
| Process report | Select dates, locations, process | Data displays | | |
| Verify filtering | Check results | Only IDs used 3+ times/day | | |

### 7.3 Discount without Rewards ID
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Select report type | Choose Discount without Rewards ID | Selected | | |
| Process report | Select dates, locations, process | Data displays | | |
| Verify data | Check results | Shows discounts without rewards ID | | |

### 7.4 Data Quality
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Employee names | Check Employee column | Names populated | | |
| Location filter | Check data | Matches selected locations | | |
| Date filter | Check dates | Within selected range | | |
| Export CSV | Click export | Downloads correctly | | |

---

## **Section 8: Rewards Transactions (Data Page)**

### 8.1 Page Access
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Page loads | Navigate to Rewards Transactions | Page displays | | |
| Access check | View access banner | "DATA Access" shown | | |

### 8.2 Data Type Check Report
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Report type | Check dropdown | "Data Type Check" available | | |
| Select dates | Choose date range | Dates selected | | |
| Select locations | Add locations | Locations added | | |
| Process | Click Process Data | Report generates | | |
| Export | Export to CSV | Downloads correctly | | |

---

## **Section 9: Raw Data Pages**

### 9.1 Raw Data Page
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Page loads | Navigate to Raw Data | Page displays | | |
| File list | View available files | JSON files listed | | |
| Download file | Select file, download | JSON file downloads | | |

### 9.2 Raw Rewards Data Page
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Page loads | Navigate to Raw Rewards Data | Page displays | | |
| File selection | Select a file | File selected | | |
| View JSON | Load file | JSON displays in viewer | | |

---

## **Section 10: Price Portal**

> ⚠️ **NOTE:** Price Portal is currently unfinished. Test available functionality and document what's working vs. broken.

### 10.1 Location Selection
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Page loads | Navigate to Price Portal | Location selection page displays | | |
| Select locations | Click locations | Locations selected | | |
| Continue | Click Continue | Proceeds to price table | | |

### 10.2 Price Table
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Table loads | After location selection | Price table displays | | |
| Category filter | Select category | Table filters | | |
| View prices | Check columns | Current prices shown | | |
| Edit price | Enter new price in 'New' column | Value accepted | | |
| Invalid price | Enter letters | Validation error | | |

### 10.3 Submit Changes
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Submit | Click Submit Price Changes | Submission processes | | |
| Account lock | After submit | Portal shows "In Progress" | | |
| Unlock | Admin unlocks | Access restored | | |

### 10.4 Known Issues / Unfinished Areas
| Area | Status | Notes |
|------|--------|-------|
| | | |
| | | |
| | | |

---

## **Section 11: Price Users (Admin)**

### 11.1 User Management
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Page loads | Navigate to Price Users | User list displays | | |
| View users | Check list | Shows price users with status | | |
| Lock user | Click Lock | User locked from Price Portal | | |
| Unlock user | Click Unlock | User unlocked | | |

### 11.2 Reports
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| View pending reports | Check reports section | Pending price changes shown | | |
| Send report | Click Send | Report sent | | |

### 11.3 Item Mappings
| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Navigate | Go to Item Mappings | Page loads | | |
| View mappings | Check table | Item mappings displayed | | |

---

## **Section 12: Settings Page**

| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Page loads | Navigate to Settings | Page displays | | |
| User info | Check displayed info | Username, Team, Email shown | | |
| Info accuracy | Verify data | Matches logged-in user | | |

---

## **Section 13: Browser Compatibility**

| Browser | Version | Works? | Issues |
|---------|---------|--------|--------|
| Chrome | Latest | | |
| Firefox | Latest | | |
| Safari | Latest | | |
| Edge | Latest | | |
| Mobile Chrome | Latest | | |
| Mobile Safari | Latest | | |

---

## **Section 14: Performance Benchmarks**

| Metric | Target | Actual | Pass? |
|--------|--------|--------|-------|
| Initial page load | < 3 sec | | |
| Navigation between pages | < 1 sec | | |
| Report (7 days, 5 locations) | < 10 sec | | |
| Report (30 days, 20 locations) | < 30 sec | | |
| CSV export | < 5 sec | | |
| Modal open/close | Instant | | |
| Form submissions | < 3 sec | | |

---

## **Section 15: Error Handling**

| Test | Steps | Expected | ✓/✗ | Notes |
|------|-------|----------|-----|-------|
| Network disconnect | Disable network, try action | Error message, no crash | | |
| Session expired | Let session expire, try action | Redirects to login | | |
| API error | (If testable) | Graceful error message | | |
| Invalid form data | Submit bad data | Validation errors shown | | |

---

## **Testing Sign-Off**

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


