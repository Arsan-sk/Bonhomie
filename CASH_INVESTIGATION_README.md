# Cash Payment Investigation SQL Queries

## Quick Start

Run this file in your Supabase SQL Editor to investigate cash payments.

## What This Does

Analyzes all cash payments in the `registrations` table to:
1. Show who made cash payments
2. Identify which events they paid for
3. Calculate revenue breakdown
4. Detect if team members are being double-counted

## Usage

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste queries from `investigate-cash-payments.sql`
3. Run each query section individually (separated by `--`)

## Key Queries

### Query 1: All Cash Payments (Detailed)
Shows every cash payment with participant name, event, fee, and whether they're a team leader or individual.

### Query 2: Total Revenue Calculation
Shows simple sum vs team-aware calculation.

### Query 3: Breakdown by Event  
Groups by event to show which events have cash payments.

### Query 4: Team Member Detection
Identifies if any participant is registered both as individual AND as team member (causes double-counting).

### Query 5: Complete Breakdown
Human-readable report showing all details.

### Query 6: Summary Statistics
Quick overview of totals.

## Expected Results

If you have ₹60 in cash payments, this will show:
- **Option A**: 1 team event with ₹60 fee (1 leader counted)
- **Option B**: 2 individual events with ₹30 fee each (2 participants counted)
- **Option C**: Some other combination summing to ₹60

## Notes

- Team leaders pay for the whole team
- Team members should NOT be counted separately
- Cash payment tracking matches `payment_mode='cash'` AND `status='confirmed'`
