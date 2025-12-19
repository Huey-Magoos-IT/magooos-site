# FBC Beta Testing Guide

This guide is for FBC (Franchise Business Consultant) users to test the Huey Magoo's Portal before full rollout.

**Testing Focus:** Authentication, % of Scans, Red Flag Reports, Groups

---

## **How to Report Issues**

When you find something wrong or confusing, note:
1. **What page** you were on
2. **What you were trying to do**
3. **What happened** (or didn't happen)
4. **Screenshots** if possible

---

## **Test 1: Authentication & Account Setup**

### 1.1 Email Verification
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Check email for verification link | Email received with "Verify Email" link | | |
| 2 | Click verification link | Browser opens, shows confirmation | | |

### 1.2 Password Setup
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Go to login page | Login form displays | | |
| 2 | Click "Reset Password" | Reset password form appears | | |
| 3 | Enter your username | Form accepts username | | |
| 4 | Click "Send Password Reset Code" | Confirmation code email received | | |
| 5 | Enter code and new password | Password reset successful | | |

### 1.3 Login
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Enter username and password | Fields accept input | | |
| 2 | Click eye icon on password field | Password visibility toggles | | |
| 3 | Click Login | Redirects to Teams page | | |
| 4 | Try wrong password | Error message shown, stays on login | | |

### 1.4 Navigation
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | View sidebar | Shows: Home, Teams, Groups, Reports section | | |
| 2 | Check Reports section | Shows: % of Scans, Red Flag Reports, Price Portal | | |
| 3 | Click Home | Home page loads with Quick Actions | | |
| 4 | Verify Quick Actions | Only shows pages you have access to | | |

---

## **Test 2: % of Scans**

### 2.1 Page Load
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Click "% of Scans" in sidebar | Page loads without errors | | |
| 2 | Check page header | Shows "% of Scans Department" | | |
| 3 | Check access message | Shows green "SCANS Access Successful" | | |

### 2.2 Report Type Selection
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Click File Content Type dropdown | Shows 3 options | | |
| 2 | Verify options | "Scan Detail", "Scan Summary", "Rolled Up Summary" | | |
| 3 | Select each option | Selection updates without error | | |

### 2.3 Date Selection
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Click Date Range Preset dropdown | Shows preset options (Last 7 Days, etc.) | | |
| 2 | Select "Last 7 Days" | Start and End dates auto-populate | | |
| 3 | Manually change Start Date | Date picker works, preset clears | | |
| 4 | Manually change End Date | Date picker works | | |
| 5 | Try to select future date | Should be blocked (max is yesterday) | | |

### 2.4 Location Selection
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | View Location Table on right | Shows only YOUR assigned locations | | |
| 2 | Click a location | Location appears as chip in Selected Locations | | |
| 3 | Click "Add All" button | All your locations added | | |
| 4 | Click X on a location chip | Location removed | | |
| 5 | Click "Clear All" | All locations removed | | |
| 6 | Click "Undo" after an action | Previous state restored | | |

### 2.5 Generate Reports
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Select: Scan Summary, Last 7 Days, 3+ locations | Form filled out | | |
| 2 | Click "Process Data" | Loading indicator appears | | |
| 3 | Wait for processing | Data table appears below | | |
| 4 | Check data table | Shows Location, Total Checks, Scans, Scan Rate | | |
| 5 | Try "Scan Detail" report | Shows employee-level breakdown | | |
| 6 | Try "Rolled Up Summary" | Shows averaged data across date range | | |

### 2.6 Data Export
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Generate a report with data | Data displays in table | | |
| 2 | Click export/download button | CSV file downloads | | |
| 3 | Open CSV file | Data matches what was displayed | | |

### 2.7 Edge Cases
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Process with no locations selected | Error message or prompt | | |
| 2 | Process with no dates selected | Error message or prompt | | |
| 3 | Select date range with no data | "No data found" message | | |

---

## **Test 3: Red Flag Reports**

### 3.1 Page Load
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Click "Red Flag Reports" in sidebar | Page loads without errors | | |
| 2 | Check page header | Shows "Reporting Department" | | |
| 3 | Check access message | Shows green "REPORTING Access Granted" | | |

### 3.2 Report Type Selection
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Click Report Type dropdown | Shows 2 options | | |
| 2 | Verify options | "Red Flag Transactions", "Discount without Rewards ID" | | |

### 3.3 Red Flag Transactions Report
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Select "Red Flag Transactions" | Report type selected | | |
| 2 | Check for "Min Daily Usage Count" field | Field appears | | |
| 3 | Enter "3" in Min Daily Usage Count | Value accepted | | |
| 4 | Select date range and locations | Form filled | | |
| 5 | Click "Process Data" | Report generates | | |
| 6 | Verify results | Shows rewards IDs used 3+ times per day | | |

### 3.4 Discount without Rewards ID Report
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Select "Discount without Rewards ID" | Report type selected | | |
| 2 | Select date range and locations | Form filled | | |
| 3 | Click "Process Data" | Report generates | | |
| 4 | Verify results | Shows discounts given without rewards ID | | |

### 3.5 Data Quality
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Check Employee Name column | Names populated where available | | |
| 2 | Check Location column | Matches selected locations | | |
| 3 | Check Date column | Within selected date range | | |

---

## **Test 4: Groups (Location Admin)**

### 4.1 Page Access
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Click "Groups" in sidebar | Page loads | | |
| 2 | View your group | Only YOUR assigned group is visible | | |
| 3 | Check group card | Shows group name and locations | | |

### 4.2 Create Location User
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Click "Create Location User" on group card | Modal opens | | |
| 2 | Check Team field | Pre-selected to "Location User" | | |
| 3 | Enter Username | Field accepts input | | |
| 4 | Enter Email | Field accepts input | | |
| 5 | Enter Temp Password | Field accepts input | | |
| 6 | Click eye icon on password | Password visibility toggles | | |
| 7 | View Location picker | Only YOUR group's locations shown | | |
| 8 | Select 1-2 locations | Locations added to form | | |
| 9 | Click Create/Submit | User created successfully | | |

### 4.3 Manage Unconfirmed Users
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | After creating user, check group card | User appears in "Unconfirmed Users" section | | |
| 2 | Click "Resend Verification" | Confirmation that email was resent | | |
| 3 | Click "Delete" on unconfirmed user | User removed from list | | |

---

## **Test 5: General Usability**

### 5.1 Performance
| Item | Acceptable? | Notes |
|------|-------------|-------|
| Page load time (< 3 seconds) | | |
| Report processing time (< 30 seconds) | | |
| Smooth navigation between pages | | |
| No freezing or unresponsive UI | | |

### 5.2 Visual/UI
| Item | Acceptable? | Notes |
|------|-------------|-------|
| Text is readable | | |
| Buttons are clearly labeled | | |
| Error messages are clear | | |
| Layout makes sense | | |
| Colors/contrast are good | | |

### 5.3 Overall Experience
| Question | Response |
|----------|----------|
| Was the signup process clear? | |
| Could you find the reports you needed? | |
| Were the report filters intuitive? | |
| Is the data presented in a useful way? | |
| What would make this more valuable for you? | |
| Any features you wish existed? | |

---

## **Feedback Summary**

**Tester Name:** _______________________

**Date Tested:** _______________________

**Overall Rating:** ☐ Works Great  ☐ Mostly Works  ☐ Needs Work  ☐ Broken

**Top 3 Issues Found:**
1.
2.
3.

**Suggestions for Improvement:**


