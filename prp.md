🏛️ BONHOMIE
Complete Digital Fest Operating System

Master Product Requirements Prompt (PRP)

1. PRODUCT OVERVIEW
Product Name:

Bonhomie – College Fest Digital Operating System

One-Line Description:

Bonhomie is a centralized digital platform that manages the complete lifecycle of a college fest — from event creation, participant registrations, payments, live updates, round progression, analytics, and digital certificates — replacing chaotic manual workflows with a structured, trusted, automated system.

Core Mission:

Transform the entire college fest ecosystem into a paperless, real-time, transparent, and verifiable digital infrastructure.

2. CORE PROBLEMS SOLVED
Manual Problems	Bonhomie Solution
Multiple Google Forms	Centralized event registry
QR payment screenshots	UPI Intent auto-confirmed payments
Paper sheets	Digital participant records
WhatsApp chaos	Real-time dashboard notifications
Lost registrations	Verified live databases
No transparency	Public live event status
Fake certificates	Verifiable digital certificates
Admin chaos	Unified analytics & command center
3. SYSTEM ROLES
1️⃣ Admin (System Owner)

The Digital Authority of Bonhomie.

2️⃣ Event Coordinator

Owner of specific events.

3️⃣ Student (Participant)

Users who browse, register, pay, participate, and receive certificates.

4. UI / UX VIBE
Mode	Experience
Light Mode	Clean, white, blue-grey, institutional, official
Dark Mode	Neon, gradients, glow, Gen-Z fest vibe

Automatically follows device theme.

5. STUDENT EXPERIENCE FLOW

Landing → Register/Login → Browse Events → View Event → Register & Pay → Dashboard → Participate → Certificate

Registration Form Fields:

Full Name

Email

Password

Roll Number

Phone

School (SOP, SOET, SOA…)

Department (CS, AIML, DS, CE, ME, ECE, Electrical, Pharmacy, Architecture)

Program (Diploma, Engineering, Pharmacy, Architecture)

Study Year (1–5)

Admission Year

Expected Pass-out

Gender

6. EVENT COORDINATOR MODULE
Coordinator Capabilities:
Feature	Description
Create Events	Full event setup
Edit Events	Modify rules, time, venue
Close Registrations	Freeze entries
View Participants	Team & individual
Push Updates	Live notifications
Round Management	Promote winners
Publish Results	Final rankings
Analytics	Revenue & participation
CSV Export	Participant lists
Event Creation Fields:
Category	Fields
Identity	Title, Description
Type	Cultural / Technical / Sports
Mode	Individual / Team
Team Rules	Min & Max members
Schedule	Fest Day, Time
Venue	Location
Price	Total fee
Rounds	Number of rounds
Rules	Event rulebook
UPI ID	Payment receiver
Banner	Cover image
7. ADMIN COMMAND CENTER

Admin has full global control.

Control	Description
Fest Settings	Name, Year, Dates
Coordinator Management	Create, edit, disable
Event Creation	Create & assign events
Force Controls	Edit / close / delete any event
Student Control	Full registry, block, export
Payment Center	Event & global finance
Analytics	Participation heatmaps
Notifications	Fest-wide alerts
System Settings	Feature toggles
Certificate Authority	Issue & verify
8. PAYMENT SYSTEM (UPI INTENT ENGINE)
Payment Model:

Direct Event UPI (Free, No Gateway)

Flow:

Student clicks Register & Pay

Bonhomie generates UPI Intent link:

upi://pay?pa=eventUPI@upi&am=200&cu=INR&tn=BH-EVENTID-ROLL


Payment app opens automatically

Student pays

Bonhomie backend silently verifies

Registration auto-confirmed

✔ No screenshots
✔ No manual UTR
✔ No charges

9. TEAM EVENT LOGIC

One student is Team Leader

Leader selects members via roll number

Members receive join requests

Only Leader pays full team amount

10. CERTIFICATE SYSTEM

Auto-generated after event completion

Unique Certificate ID

Public Verify Certificate page

Anyone can verify authenticity

11. DATABASE DESIGN (Supabase)
Tables:
Table	Purpose
users	Student records
coordinators	Coordinator profiles
events	All fest events
registrations	Event participations
teams	Team data
team_members	Member relations
payments	Payment logs
rounds	Event rounds
results	Winners
certificates	Issued certificates
notifications	Live updates
admin_settings	Fest configs

All tables linked via foreign keys.

12. ARCHITECTURE
Layer	Tech
Frontend	React
Backend	Node.js
Database	Supabase
Payments	UPI Intent
Hosting	Cloud
Certificates	Server-side PDF + DB
Analytics	Supabase Views
13. SUPERBASE CONNECTION PLACEHOLDERS
SUPABASE_URL = ""
SUPABASE_ANON_KEY = ""
SUPABASE_SERVICE_ROLE_KEY = ""


Bonhomie is not a website.
It is a digital public institution for college festivals.