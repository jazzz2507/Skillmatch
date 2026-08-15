# SkillMatch UI Suite

Build a modern full-stack frontend UI for a student project collaboration platform called "SkillMatch".

IMPORTANT:

This is primarily a frontend UI project. Do not replace or recreate my existing Flask + MySQL backend. The backend will be connected later through REST APIs.

TECH STACK:

- React

- TypeScript

- Tailwind CSS

- Modern responsive design

- Component-based architecture

DESIGN:

Create a polished, professional interface suitable for a college project that I can showcase on GitHub, LinkedIn, and my portfolio.

Use a dark modern theme with:

- Deep navy background

- Purple/blue gradient accents

- Clean cards

- Rounded corners

- Subtle shadows

- Smooth hover animations

- Responsive desktop/tablet/mobile layouts

BRAND:

Name: SkillMatch

Tagline: "Find the right skills. Build the right team."

PAGES:

1. LANDING PAGE

- SkillMatch logo/name

- Hero section

- Short explanation of the platform

- "Find Your Team" CTA

- "Explore Projects" CTA

- Features section:

  - Skill-based matching

  - Student profiles

  - Project collaboration

  - Team requests

- How it works section

2. LOGIN PAGE

- Email

- Password

- Login button

- Link to registration

- Clean validation/error states

3. REGISTRATION PAGE

- Full name

- Email

- Password

- Confirm password

- Register button

4. DASHBOARD

Show:

- Welcome message

- Profile completion

- Current skills

- Recommended projects

- Top skill matches

- Pending team requests

- Quick actions

5. PROFILE PAGE

Show/edit:

- Full name

- Email

- Bio

- GitHub URL

- Technical skills

- Add/remove skills

6. PROJECTS PAGE

Show project cards containing:

- Project title

- Description

- Project owner

- Team size

- Required skills

- Match percentage

- View project button

Include:

- Search

- Skill filters

- Match percentage sorting

- Create Project button

7. CREATE PROJECT PAGE

Fields:

- Project title

- Description

- Team size

- Required skills

- Create Project button

8. PROJECT DETAILS PAGE

Show:

- Project title

- Description

- Owner

- Required skills

- Team size

- Current members

- Match percentage

- "Request to Join" button

9. MATCHES PAGE

Create attractive match cards.

Each card should show:

- Project name

- Match percentage

- Matching skills

- Missing skills

- Required skills

- Project owner

- Request to Join button

Example:

92% Match

Matching Skills:

Python, MySQL, Flask

Missing Skills:

React

10. TEAM REQUESTS PAGE

Separate:

- Incoming requests

- Sent requests

Incoming request actions:

- Accept

- Reject

Sent requests:

- Pending

- Accepted

- Rejected

11. NAVIGATION

Desktop navigation:

- Dashboard

- Matches

- Projects

- Profile

- Team Requests

- Logout

Mobile navigation should collapse into a menu.

IMPORTANT FUNCTIONALITY:

For now use realistic mock data for the frontend.

Structure the application so that the mock data can later be replaced with API calls to my existing Flask backend.

Create a clear API service layer, for example:

- authService

- profileService

- projectService

- matchService

- teamRequestService

Do not hard-code API calls throughout the UI components.

Make the UI feel like a real production application rather than a basic student CRUD project.

Use reusable components for:

- Navbar

- ProjectCard

- SkillBadge

- MatchCard

- RequestCard

- DashboardCard

- Modal

- Form components

Make all pages visually consistent.

Add loading states, empty states, error states, and success notifications.

Do not implement real authentication or database functionality yet. Use mock data until the Flask API is connected.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5e5af55a-475f-470a-8335-eb28ad022b01).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
