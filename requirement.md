Yes — that changes the scope significantly.

You already have the complete online appointment system, so you don't need to rebuild patient-facing booking, doctor availability, online scheduling, etc.

What you're missing is the physical/in-clinic workflow after the patient arrives at the clinic.

So I would design the new module around:

Online Appointment → Patient Arrives → Reception → Check-in → Queue → Doctor Consultation → Prescription/Medical Record → Payment → Visit Complete

No lab, pharmacy, or nurse module.

1. Your system should have these roles
   Admin

Admin manages the clinic operation:

Doctors
Receptionists
Staff/users
Departments/specializations
Services
Consultation fees
Doctor schedules
Clinic settings
Reports
Payments
Permissions
Audit logs
Receptionist

This is the main physical-clinic operator.

See today's appointments
See online appointments
Register walk-in patients
Search existing patients
Check-in patients
Confirm appointment arrival
Generate token/queue number
Manage waiting queue
Assign/reassign doctor
Collect payment
Print receipt
View patient basic history
Mark appointment completed/cancelled/no-show
Doctor

Doctor gets a separate workspace.

Today's appointments
Waiting patients
Call next patient
Patient profile
Medical history
Previous visits
Vitals
Consultation
Diagnosis
Prescription
Doctor notes
Follow-up
Attach documents
Complete consultation
Print/download prescription 2. Most important: connect it with your existing online appointment system

You should not create a second appointment system.

Your existing appointment system should become the source of appointments.

For example:

ONLINE SIDE
Patient
↓
Books appointment online
↓
Appointment created
↓
Doctor + date + time

Then on clinic day:

PHYSICAL CLINIC
↓
Reception sees appointment
↓
Patient arrives
↓
Reception clicks "Check In"
↓
Token generated
↓
Waiting Queue
↓
Doctor calls patient
↓
Consultation
↓
Prescription
↓
Payment
↓
Completed

This is the key integration.

3. Appointment statuses need to be expanded

Your existing online system probably has statuses such as:

Pending
Confirmed
Cancelled
Completed

For physical clinic, add operational statuses:

Scheduled
Confirmed
Arrived
Checked-In
Waiting
With Doctor
Consultation Completed
Payment Pending
Completed
Cancelled
No Show

I would not create separate appointment records for physical visits.

Instead, extend your existing appointment record with the physical workflow.

4. Reception Dashboard

This should become the central screen for physical clinic management.

Something like:

Reception Dashboard

┌─────────────────────────────────────────────┐
│ Today's Overview │
├────────────┬────────────┬───────────────────┤
│ Appointments│ Checked In │ Waiting │
│ 32 │ 21 │ 8 │
├────────────┴────────────┴───────────────────┤
│ │
│ Today's Appointments │
│ │
│ 09:00 Ali Dr. Ahmed Confirmed │
│ 09:30 Sara Dr. Ahmed Checked In │
│ 10:00 Usman Dr. Ali Waiting │
│ 10:30 Ayesha Dr. Ali With Doctor │
│ │
└─────────────────────────────────────────────┘

Actions:

Check In | View Patient | Token | Payment | More

5. Check-in workflow

This is one of the most important features you're adding.

Patient arrives and receptionist searches:

Search by:

Patient ID
Phone
Name
Appointment ID

If appointment exists:

Muhammad Ali
Appointment: 10:30 AM
Doctor: Dr. Ahmed
Service: Consultation

[ CHECK IN ]

After clicking:

Appointment Status → Checked-In
Queue Status → Waiting
Token → A-012 6. Walk-in patients

Your physical system should also support patients who don't have an online appointment.

Reception:

- New Walk-In Patient

Then:

Existing Patient?
↓
Yes ─────────────── No
↓ ↓
Search patient Register patient
↓ ↓
└─────────┬─────────┘
↓
Select Doctor
↓
Select Service
↓
Generate Token
↓
Waiting

This is important because physical clinics will always have some walk-ins.

7. Queue management

You need a dedicated queue screen.

Example:

Dr. Ahmed — Today's Queue

## Token Patient Status

A-001 Muhammad Ali Completed
A-002 Sara Khan With Doctor
A-003 Usman Ahmed Waiting
A-004 Ayesha Waiting
A-005 Bilal Waiting

Doctor can click:

Call Next Patient

Then:

A-003
Usman Ahmed

Status:
Waiting → With Doctor

Reception should immediately see the updated status.

8. Doctor Dashboard

The doctor shouldn't see the entire admin/reception interface.

Doctor dashboard:

Good Morning, Dr. Ahmed

Today's Patients 18
Waiting 5
Completed 10
Remaining 8

---

Current Queue

A-002 Sara Khan Waiting
A-003 Usman Ahmed Waiting
A-004 Bilal Ahmed Waiting

[Open Patient] 9. Doctor's Patient Consultation

When doctor opens the patient:

Patient:
Muhammad Ali

Age: 32
Gender: Male
Phone: 03XX-XXXXXXX

---

Previous Visits
Medical History
Allergies
Previous Prescriptions
Documents

---

CURRENT VISIT

Chief Complaint
[........................]

Symptoms
[........................]

Vitals

BP: [ ]
Temperature:[ ]
Pulse: [ ]
Weight: [ ]
Height: [ ]
SpO2: [ ]

Diagnosis
[ Search / Add Diagnosis ]

Treatment / Notes
[........................]

Prescription

## Medicine | Dose | Frequency | Duration

[ + Add Medicine ]

Follow-up Date
[ ]

[ Save Consultation ] 10. Medical History

Don't overwrite patient information every time.

Each visit should create a separate consultation record.

For example:

Patient
│
├── Visit #001
│ ├── Diagnosis
│ ├── Vitals
│ ├── Notes
│ └── Prescription
│
├── Visit #002
│ ├── Diagnosis
│ ├── Vitals
│ ├── Notes
│ └── Prescription
│
└── Visit #003
├── Diagnosis
├── Vitals
├── Notes
└── Prescription

Doctor can see the complete history without modifying old visits.

11. Prescription

The doctor should be able to create a professional prescription.

CLINIC NAME

Dr. Ahmed
Specialist

Patient:
Muhammad Ali

Date:
12 Aug 2026

Diagnosis:
...

Rx

1. Medicine Name
   500mg
   Twice Daily
   5 Days

2. Medicine Name
   10mg
   Once Daily
   7 Days

Instructions:
...

Follow-up:
20 Aug 2026

Actions:

Print Prescription | Download PDF

12. Billing

Since you already have online appointments, connect billing to the appointment/service.

Example:

Appointment

Doctor:
Dr. Ahmed

Service:
General Consultation

Fee:
PKR 2,000

Reception clicks:

Collect Payment

Invoice

Consultation PKR 2,000
Discount PKR 200

---

Total PKR 1,800

Payment Method:
Cash / Card / Online

[Collect Payment]

Then:

Payment Status → Paid
Appointment Status → Completed 13. Patient profile

Make one central patient profile shared by reception and doctor.

Patient Profile

Muhammad Ali
PT-000124

Overview
Appointments
Visits
Medical History
Prescriptions
Invoices
Documents

But permissions should control what each role can access.

Reception

Can see:

Basic information
Appointments
Payment
Basic history
Doctor

Can see:

Medical history
Visits
Diagnosis
Prescriptions
Documents
Consultation information 14. Admin reports

Since there is no pharmacy/lab, keep reporting focused.

Appointment reports
Total appointments
Online appointments
Walk-ins
Completed
Cancelled
No-show
Doctor-wise appointments
Patient reports
New patients
Returning patients
Daily patients
Monthly patients
Revenue reports
Daily revenue
Weekly revenue
Monthly revenue
Doctor-wise revenue
Service-wise revenue
Paid/unpaid invoices
Doctor reports
Total consultations
Completed consultations
Cancelled appointments
Revenue generated 15. Notifications

Since you already have the online appointment system, you may already have notifications.

For the physical module, add operational notifications where useful:

Reception → Doctor
"Patient A-012 is ready."

Doctor → Reception
"Consultation completed."

Reception
"Payment pending for A-012."

You can implement these as real-time dashboard updates rather than SMS initially.

16. Database changes

Since you already have the online appointment system, don't rebuild your database.

Extend it.

Conceptually:

users
roles
permissions

patients
doctors
appointments
services

consultations
vitals
diagnoses
prescriptions
prescription_items

queues
invoices
invoice_items
payments

patient_documents
notifications
audit_logs

Your existing tables should be reused wherever possible.

17. The architecture I recommend for your existing app

Think of the application as two connected systems:

                 CLINIC MANAGEMENT SYSTEM
                         │
          ┌──────────────┴──────────────┐
          │                             │
     ONLINE SYSTEM               PHYSICAL SYSTEM
          │                             │
          │                             │

Patient Booking Reception
│ │
Doctor Schedule Check-in
│ │
Online Appointment Queue
│ │
└────────── Appointment ───────┘
│
▼
Doctor
│
▼
Consultation
│
┌───────────┴──────────┐
▼ ▼
Prescription Billing
│ │
└──────────┬───────────┘
▼
Visit Complete
Your MVP should therefore be only 3 new areas:
🧑‍💼 Reception

Dashboard → Patients → Appointments → Check-in → Queue → Billing

👨‍⚕️ Doctor

Dashboard → Queue → Patients → Consultation → Prescription → History

👑 Admin

Dashboard → Doctors → Staff → Services → Reports → Settings

That's a much cleaner scope than the previous roadmap.

Don't add lab, pharmacy, or nurse modules at all if they're not part of this clinic. You can always design the permission architecture so those modules could be added later without affecting the current system.
