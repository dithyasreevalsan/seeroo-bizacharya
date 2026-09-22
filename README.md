# Bizacharya — Phase 1 website (static HTML prototype)

Static, no-build marketing site for Bizacharya Consulting Pvt. Ltd. Content is taken verbatim from
"Final biz-acharya For Seeroo.pdf" (Phase 1). Open `index.html` in a browser — no server needed.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | Home (hero, journey roadmap, sectors, services, vision/mission, success stories, community, enquiry) |
| `about.html` | About + Leadership |
| `opportunities/*.html` | 6 sector pages (one shared template) |
| `services/*.html` | 7 service pages (one shared template) |
| `learning-hub.html`, `blog-detail.html` | Free videos / blogs; Premium toggle shows "Coming Soon" |
| `community.html`, `event-detail.html` | Events list + event page (upcoming / info-only / completed states) |
| `success-stories.html` | Carousel + grid |
| `careers.html`, `job-detail.html` | Business Associate registration (modal) + jobs |
| `contact.html` | Contact, enquiry form, map |
| `login.html`, `signup.html`, `portal/*.html` | **Phase 2 placeholders** — structure only, forms disabled |
| `assets/css/style.css`, `assets/js/main.js`, `assets/img/logo.png` | Shared design system, behaviour, logo |

Header and footer markup is identical on every page (generated from one template), so they convert
directly into Blade partials.

## Laravel integration notes (Phase 2)

Suggested mapping when moving to Laravel:

- `resources/views/layouts/app.blade.php` ← the `<head>`, header, drawer, footer and floating buttons.
- One Blade view per page; sector and service pages become a single view fed by a `sectors` / `services` table (or config array).
- Every form already has `method="post"`, an `action="#"` to replace with a named route, consistent `name` attributes, and an HTML comment naming the intended route. Add `@csrf` inside each form.

| Form | Suggested route | Fields |
| --- | --- | --- |
| Enquiry (home, contact) | `POST enquiry.store` | name, mobile, email, city, interest, service[] |
| Event registration | `POST events.register` | name, phone, email, address, pincode |
| Business Associate registration | `POST associates.store` | name, mobile, email, district, occupation, organization, why |
| Job application | `POST jobs.apply` (multipart) | name, email, phone, cv |
| Learning Hub "Notify me" | reuse enquiry | — |
| Login / Sign up (Phase 2) | `POST login`, `register.entrepreneur`, `register.associate` | see login.html / signup.html |

Suggested tables: `enquiries`, `events`, `event_registrations`, `associates`, `jobs`, `job_applications`,
`posts` (blog / guide / scheme / video), `videos`, `success_stories`, `users` (role: entrepreneur | associate), `subscriptions`.

Client-side validation lives in `assets/js/main.js` (`data-validate` forms); keep server-side validation in Form Requests.

## Placeholders to replace before launch

Search the HTML for `<!-- PLACEHOLDER` comments. They mark: sample success stories, events, jobs, blog posts,
video IDs (`VIDEO_ID_*`), the leadership portrait, all image blocks (`.ph`, each with a descriptive label of
the intended rural-Kerala photo), the Malayalam hero line, and the Phase 2 module lists.
