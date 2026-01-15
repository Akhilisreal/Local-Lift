#Local Lift

## Key goals
- Make it easy for users to find and favorite local businesses
- Provide quick profile and review flows
- Keep the code simple and easy to extend

## Demo
- Open `index.html` in a browser to view the app locally.

## Features
- Business listing and detail pages
- User authentication (login/signup) pages
- Favorites page to save businesses
- Profile and reviews management
- Captcha page for verification

## Prerequisites
- Access to internet

## Project structure (high level)
- `index.html` — main page
- `pages/` — individual HTML pages: business, favorites, login, profile, signup, etc.
- `assets/` — images and static assets
- `css/` — stylesheets for different parts of the app
- `js/` — JavaScript modules for UI, Firebase, businesses, auth, reviews, etc.

## Notable files
- `js/firebase.js` — Firebase integration
- `pages/business.html` — business detail page
- `pages/login.html` and `pages/signup.html` — authentication flows

## Development notes
- This is a front-end project, all backend or database features are created through Firebase realtime database and authentication `js/firebase.js` `js/auth.js`.
- Keep UI logic separated: `js/ui.js` for shared UI helpers, page-specific logic in their respective JS files.