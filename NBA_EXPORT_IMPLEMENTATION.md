# NBA Bonomy 2026 Export Implementation Plan

## Overview
Implement a new CSV export option in the admin analytics section that generates an NBA (Annual Report) format file following the structure from NBA Bonomy 2025.

## File Structure Analysis

Based on the provided sample, the NBA report contains 4 main sections:

### 1. CULTURAL Section
- Header row: "CULTURAL" spanning all columns
- Empty spacing row
- **SOLO Subsection:**
  - Header: SR NO | SOLO (3 cols merged) | Additional cols
  - Sub-headers: | empty | REGISTERED | ACTUAL PARTICIPATION |
  - Row 1: EVENTS | count | count
  - Row 2: PARTICIPANTS | count | count
- Empty spacing row
- **TEAMS Subsection:**
  - Header: SR NO | TEAMS
  - Row 1: EVENTS | count
  - Row 2: TEAMS | count
  - Row 3: PARTICIPANTS IN THE TEAMS | count
- Total rows:
  - TOTAL PARTICIPATION TEAM/
  - TOTAL PARTICIPANTS

### 2. SPORTS Section
Same structure as Cultural

### 3. TECHNICAL Section
Same structure as Cultural

### 4. NBA REQUIREMENTS Section
- Header row: "NBA REQUIREMENTS"
- Empty spacing row
- Column headers: SR NO | EVENT | NO OF EVENT | NO OF TEAMS | PARTICIPANTS | Registered
- Data rows:
  - Row 1: SPORTS | event_count | team_count | participant_count | highlighted
  - Row 2: CULTURAL | event_count | team_count | participant_count | highlighted
  - Row 3: TECHNICAL | event_count | team_count | participant_count | highlighted
  - Row 4: TOTAL | total_events | total_teams | total_participants | total

## Data Sources

### From Supabase:
- **events table**: category, subcategory (Individual/Group)
- **registrations table**: status='confirmed', team_members
- **profiles table**: participant details

### Calculations:
1. **Solo Events**: subcategory='Individual'
2. **Team Events**: subcategory='Group'
3. **Registered**: Count of records in database
4. **Actual Participation**: Count of confirmed registrations

## Implementation Steps

### 1. Create NBA Export Function (`csvExport.js`)
```javascript
export function generateNBACSV(registrations)
```
- Group registrations by category (Cultural, Sports, Technical)
- For each category, separate Individual vs Group
- Calculate statistics for each subsection
- Build CSV rows with proper formatting (empty rows, merged cells simulation)

### 2. Update AdminAnalytics Component
- Add "NBA" option to exportType dropdown
- Create handleExportNBA function
- Fetch all confirmed registrations with event details
- Call generateNBACSV and download

### 3. CSV Structure Implementation
- Use empty strings for spacing rows
- Use column repetition to simulate merged cells
- Include all table structures even if data is empty (0 values)

## Edge Cases
1. **No data**: Export table structure with 0 values
2. **Missing categories**: Include all categories (Cultural, Sports, Technical) even if empty
3. **Team members**: Count team leader + members for actual participation

## File Naming
- Format: `NBA_Bonomy_2026_YYYY-MM-DD.csv`
- Example: `NBA_Bonomy_2026_2026-01-21.csv`

## Data Mapping
| CSV Field | Source |
|-----------|--------|
| EVENTS (Solo) | Count of Individual events per category |
| PARTICIPANTS (Solo Registered) | Count of Individual registrations |
| PARTICIPANTS (Solo Actual) | Count of confirmed Individual registrations |
| EVENTS (Teams) | Count of Group events per category |
| TEAMS | Count of Group registrations (team leaders) |
| PARTICIPANTS IN TEAMS | Sum of (team_members.length + 1) for all teams |
| TOTAL PARTICIPATION TEAM/ | Formula calculation |
| TOTAL PARTICIPANTS | Sum of all participants |

## Testing Checklist
- [ ] Export with full data shows correct counts
- [ ] Export with no data shows table structure with zeros
- [ ] Export with only Individual events
- [ ] Export with only Group events
- [ ] Export with mixed categories
- [ ] File downloads with correct name
- [ ] CSV opens correctly in Excel/Sheets
- [ ] Column widths are readable (manual adjustment may be needed)
