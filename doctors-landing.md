Build a complete "Doctor Public Landing Page" system inside the existing Clinic Management System.

IMPORTANT CONTEXT:

- The application already has an online appointment system.
- The application now supports both physical/in-person clinic appointments and online/telehealth appointments.
- Physical clinic workflow is the primary workflow, while online/telehealth remains supported.
- Do NOT rebuild or break the existing appointment, patient, doctor, authentication, consultation, or payment systems.
- Reuse the existing database models, APIs, authentication, doctor records, appointment system, services, and availability wherever possible.
- There are NO pharmacy, laboratory, or nurse modules in this system.
- Analyze the existing codebase first and integrate this feature into the current architecture instead of creating duplicate systems.

GOAL:
Each doctor should have their own professional, public, shareable landing page that they can customize from their doctor dashboard.

Example public URLs:

/doctors/dr-ahmed
/doctors/dr-sara-khan
/doctors/dr-muhammad-ali

The exact routing convention should follow the existing application's architecture.

The public doctor page should be suitable for sharing with:

- Existing patients
- New patients
- WhatsApp contacts
- Social media
- Website visitors
- Referral patients

The page should feel like a premium professional doctor website, NOT a generic CRUD profile page.

==================================================

1. # DOCTOR DASHBOARD — LANDING PAGE BUILDER

Add a new section in the Doctor Dashboard:

"Public Profile"
or
"Doctor Landing Page"

Inside it, doctors should be able to customize their public page.

Create a clean dashboard editor with sections such as:

- Profile
- About
- Specializations
- Services
- Experience
- Education
- Certifications
- Reviews
- Availability
- Clinic Information
- Online Consultation
- Physical Consultation
- FAQs
- Social Links
- SEO
- Page Appearance

The doctor should be able to enable/disable sections.

Do NOT allow arbitrary HTML/CSS editing.

Use controlled fields and predefined components so the design remains consistent and professional.

================================================== 2. DOCTOR PROFILE
==================================================

Allow the doctor to manage:

- Profile photo
- Full name
- Professional title
- Specialization
- Short introduction
- About/bio
- Years of experience
- Qualification
- Registration/license information if supported by the existing system
- Languages
- Gender if applicable
- Location/clinic
- Contact information where appropriate

Example:

Dr. Ahmed Khan
MBBS, FCPS
Consultant Cardiologist

"Helping patients achieve better heart health through personalized, evidence-based care."

================================================== 3. HERO SECTION
==================================================

Create a strong premium hero section.

It should include:

- Doctor photo
- Doctor name
- Credentials
- Specialization
- Short introduction
- Years of experience
- Rating/review summary
- Number of patients/consultations if this data exists
- Primary CTA:
  "Book an Appointment"

Secondary CTA:
"View Availability"

If both physical and online appointments are available, clearly show:

"Physical Consultation"
"Online Consultation"

Do not hardcode availability.

Use the existing doctor/service/appointment data.

The hero should immediately communicate:

Who the doctor is
What they specialize in
How the patient can book

================================================== 4. BOOK APPOINTMENT CTA
==================================================

The landing page must connect directly to the EXISTING appointment system.

Do NOT create a separate appointment engine.

When the user clicks:

"Book an Appointment"

open/use the existing appointment booking flow.

The patient should be able to select the appropriate appointment type:

- In-person / Physical
- Online / Telehealth

Respect the doctor's existing availability and services.

For physical appointments, use the existing physical clinic workflow.

For online appointments, preserve the existing online prepaid workflow.

================================================== 5. ABOUT DOCTOR
==================================================

Create a professional About section.

Fields:

- Biography
- Professional philosophy
- Experience
- Areas of expertise
- Languages
- Education
- Certifications

Use structured content instead of one giant text field wherever practical.

Example sections:

Education
MBBS — XYZ Medical College

Experience
10+ years in cardiology

Expertise

- Hypertension
- Heart disease
- Preventive cardiology

================================================== 6. SERVICES / SPECIALTIES
==================================================

Allow each doctor to select services from the existing service system.

Show:

Service name
Description
Consultation type
Duration if available
Price if configured
Book button

Example:

General Consultation
Physical Consultation
PKR XXXX

Online Consultation
PKR XXXX

Important:
Do not create duplicate service records if the application already has a service model.

Reuse the existing services.

================================================== 7. REVIEWS / TESTIMONIALS
==================================================

Add a proper Reviews section.

This should be more than manually typed fake testimonials.

Use the existing patient/appointment/review data if a review system already exists.

If the application does not currently have reviews, implement a proper review model.

Each review should support:

- Patient display name
- Rating (1–5)
- Review text
- Date
- Verification status
- Published status

Only approved/published reviews should appear publicly.

Do NOT expose sensitive patient information.

Consider showing:

4.9/5
Based on 124 reviews

Then display review cards.

Allow doctor/admin moderation where appropriate.

The doctor dashboard should show:

Pending Reviews
Published Reviews
Rejected/Hidden Reviews

================================================== 8. REVIEW SUBMISSION FLOW
==================================================

If implementing a new review system:

Only allow reviews from eligible patients, preferably patients who have a completed appointment/consultation with that doctor.

Do not allow arbitrary anonymous users to create public reviews.

Create a workflow:

Completed Consultation
↓
Eligible for Review
↓
Patient submits rating + review
↓
Pending Moderation
↓
Admin/authorized staff approves
↓
Published on Doctor Landing Page

Make this compatible with both physical and online consultations.

================================================== 9. AVAILABILITY
==================================================

Show the doctor's real availability using the existing schedule system.

Example:

Available for:

Physical Consultation
Mon–Fri
9:00 AM – 2:00 PM

Online Consultation
Mon–Fri
5:00 PM – 8:00 PM

Do not duplicate schedule logic.

Use the existing doctor's availability.

The landing page should show a useful availability preview and link directly to booking.

================================================== 10. PHYSICAL CLINIC INFORMATION
==================================================

Because physical clinic is the primary workflow, make this prominent.

Show:

- Clinic name
- Address
- City
- Contact
- Working hours
- Consultation type
- Map/location if supported
- Physical appointment CTA

Example:

"Visit the Clinic"

[Get Directions]

[Book Physical Appointment]

Reuse existing clinic/branch information where available.

Do not duplicate clinic data unnecessarily.

================================================== 11. ONLINE CONSULTATION
==================================================

Include a dedicated online consultation section if the doctor supports telehealth.

Explain:

- Online consultation availability
- Consultation type
- Price if configured
- How it works
- Booking CTA

Example:

"Can't visit the clinic?"

"Book an online consultation with Dr. Ahmed from anywhere."

[Book Online Consultation]

Again, connect to the existing telehealth appointment flow.

================================================== 12. FAQ SECTION
==================================================

Allow doctors/admins to configure FAQs.

Example:

Can I book a physical appointment?
Yes, select Physical Consultation when booking.

Do you offer online consultations?
Yes.

How can I reschedule?
Use the existing appointment management process.

Doctors should be able to add/edit/delete FAQ items from their dashboard.

================================================== 13. SOCIAL LINKS
==================================================

Allow optional:

- Facebook
- Instagram
- LinkedIn
- X/Twitter
- YouTube
- Website

Only show links that are configured.

================================================== 14. PAGE TEMPLATE SYSTEM
==================================================

All doctors should use the SAME professional design system/template.

Do NOT build a completely different page from scratch for every doctor.

Instead:

Shared Template +
Doctor-specific Content +
Doctor-specific Settings
=
Unique Doctor Landing Page

The template should include reusable sections:

1. Header
2. Hero
3. About
4. Expertise
5. Services
6. Reviews
7. Availability
8. Physical Clinic
9. Online Consultation
10. FAQs
11. Final CTA
12. Footer

Doctors can control:

- Section visibility
- Content
- Ordering where appropriate
- Profile image
- Bio
- Services
- FAQs
- Social links
- CTA text
- Page SEO

But they should NOT be able to destroy the design system.

================================================== 15. LIMITED APPEARANCE CUSTOMIZATION
==================================================

Provide professional customization options.

For example:

- Accent color
- Button style
- Profile image
- Hero image/background where supported
- Section visibility
- Section order
- CTA preferences

Use predefined design tokens.

Do NOT allow arbitrary CSS.

Do NOT allow doctors to select ugly/random colors that can damage the brand.

The public pages should always remain visually consistent with the main clinic platform.

================================================== 16. LIVE PREVIEW
==================================================

The doctor dashboard should have:

"Edit Profile"

and

"Preview Page"

Ideally provide a live preview.

Layout:

---

## Doctor Landing Page Editor

LEFT:
Settings / Sections

RIGHT:
Live Preview

[Save Changes]
[Preview]
[Publish]

The doctor should know exactly what the public page looks like before publishing.

================================================== 17. PUBLISHING SYSTEM
==================================================

Add page status:

Draft
Published
Unpublished

Doctor can:

Save Draft
Preview
Publish
Unpublish

Public page should only be accessible when published.

If possible, keep a draft version separate from published data so unfinished changes do not immediately appear publicly.

================================================== 18. SHARE FUNCTION
==================================================

Add a prominent:

"Share Profile"

button inside the doctor dashboard.

Options:

- Copy Link
- WhatsApp
- Facebook
- LinkedIn
- X

Example:

"Share your doctor profile with patients"

https://domain.com/doctors/dr-ahmed-khan

The exact domain and routing must follow the existing application.

================================================== 19. SEO
==================================================

Each doctor page should have its own SEO metadata.

Allow configuration of:

SEO Title
SEO Description
OG Image
Canonical URL

Default SEO should automatically use doctor information.

Example:

Title:
Dr. Ahmed Khan | Cardiologist | Clinic Name

Description:
Book a physical or online consultation with Dr. Ahmed Khan, Consultant Cardiologist. View availability, services, reviews and appointment options.

Also implement appropriate structured data where suitable, such as Doctor/Person and MedicalBusiness-related schema where valid.

Do not create duplicate/conflicting JSON-LD with existing site-wide SEO.

================================================== 20. MOBILE DESIGN
==================================================

The public landing page must be mobile-first.

A large percentage of patients may arrive through WhatsApp on mobile.

Make sure:

- Hero works on mobile
- Doctor photo is clear
- CTA is immediately visible
- Booking button is easy to tap
- Reviews are readable
- Address is accessible
- Availability is readable
- Sticky mobile "Book Appointment" CTA is considered

The page should feel like a premium mobile doctor profile, not an admin dashboard.

================================================== 21. SECURITY & PRIVACY
==================================================

Never expose:

- Patient phone numbers
- Patient email addresses
- CNIC or identity information
- Medical records
- Private appointment details
- Internal notes
- Payment information
- Private documents

Reviews must also protect patient privacy.

Only public doctor information should be rendered on the public page.

Ensure server-side authorization for doctor profile editing.

A doctor must ONLY be able to edit their own landing page.

Admin should be able to manage all doctor pages according to existing permissions.

================================================== 22. DATABASE DESIGN
==================================================

First inspect the existing database.

Reuse existing:

- users
- doctors
- patients
- appointments
- services
- schedules
- clinics
- reviews if available

Only create new models/fields where required.

Potential new entities could include:

DoctorPublicProfile
DoctorPublicProfileSection
DoctorReview
DoctorFAQ
DoctorSocialLink
DoctorPageSettings

But DO NOT blindly create these models.

First analyze the current schema and determine whether existing models can support the functionality.

Avoid duplicate data.

For example:

Do NOT create another doctor table.

Do NOT create another service table.

Do NOT create another appointment table.

================================================== 23. ADMIN CONTROL
==================================================

Add admin management for doctor public pages.

Admin should be able to:

- View all doctor pages
- Search doctors
- See Published/Draft status
- Preview page
- Publish/unpublish
- Moderate reviews
- Manage featured doctors if needed
- Manage templates
- Configure global landing-page settings

================================================== 24. PERFORMANCE
==================================================

Public doctor pages are marketing pages, so performance matters.

Implement:

- Optimized images
- Lazy loading where appropriate
- Server-side rendering/static rendering where appropriate
- SEO-friendly HTML
- Minimal client-side JavaScript
- Proper caching/revalidation where appropriate

Do not turn the entire public page into a client component unnecessarily.

================================================== 25. DESIGN DIRECTION
==================================================

The landing page should feel:

- Premium
- Medical
- Trustworthy
- Modern
- Human
- Professional
- Clean
- Conversion-focused

Avoid:

- Generic dashboard-style profile pages
- Excessive gradients
- Over-animation
- AI-looking design
- Excessive glassmorphism
- Random colors
- Huge unnecessary cards
- Stock-looking layouts

The doctor should look like a real professional with a credible online presence.

Focus heavily on:

Typography
Spacing
Hierarchy
Doctor photography
Trust signals
Reviews
Clear CTAs
Appointment conversion

================================================== 26. IMPORTANT UX PRIORITY
==================================================

The page's primary purpose is:

GET THE PATIENT TO BOOK AN APPOINTMENT.

Therefore the main CTA should always be visible at appropriate points.

Primary CTA:

"Book Appointment"

Secondary:

"View Availability"

If both appointment types are supported:

"Book Physical Visit"
"Book Online Consultation"

Physical should receive stronger visual priority because physical clinic is the primary product.

================================================== 27. FINAL ACCEPTANCE CRITERIA
==================================================

The feature is complete only when:

[ ] Every doctor can have a unique public profile URL.
[ ] Doctor can edit their own public profile.
[ ] Doctor can upload/change profile image.
[ ] Doctor can edit bio and professional information.
[ ] Doctor can select/manage public services.
[ ] Doctor can configure FAQs.
[ ] Doctor can configure social links.
[ ] Doctor can manage page visibility.
[ ] Doctor can preview before publishing.
[ ] Doctor can publish/unpublish.
[ ] Doctor can share their profile link.
[ ] Public page is responsive.
[ ] Public page has strong appointment CTAs.
[ ] Physical appointment connects to existing booking system.
[ ] Online appointment connects to existing telehealth system.
[ ] Existing appointment workflow is not broken.
[ ] Existing payment flow is not broken.
[ ] Existing physical clinic workflow is not broken.
[ ] Existing doctor schedules are reused.
[ ] Existing services are reused.
[ ] Reviews are properly moderated.
[ ] Patient privacy is protected.
[ ] Doctor cannot edit another doctor's profile.
[ ] Admin can manage doctor pages.
[ ] SEO metadata exists per doctor.
[ ] Public page is optimized for mobile.
[ ] No duplicate appointment/doctor/service architecture is introduced.

==================================================
IMPLEMENTATION APPROACH
==================================================

Before writing code:

1. Analyze the current project architecture.
2. Identify existing doctor model.
3. Identify existing patient model.
4. Identify existing appointment model.
5. Identify existing services.
6. Identify existing doctor availability/schedule.
7. Identify existing authentication/authorization.
8. Identify existing review functionality if any.
9. Identify existing SEO system.
10. Identify existing public/private route structure.

Then provide a concise implementation plan showing:

- Files that need modification
- New files
- Database changes
- API/server actions
- Routes
- Components
- Permissions
- Data relationships

IMPORTANT:
Do not immediately start rewriting large parts of the application.

First understand the existing architecture and reuse it.

After the analysis, implement the feature incrementally and keep the existing online + physical appointment functionality working.
