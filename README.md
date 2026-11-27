<p align="center"><img src="https://static.wixstatic.com/media/73c6a3_3f2c7739106c4ebc87a46c2f65c0c16c~mv2.png" alt="CWHW.in logo" width="160"></p>

# CWHW.in (Classwork Homework)

CWHW.in is an online collaborative learning platform for Indian school students, built by Tanuj Yadav. It has 250+ registered student users.

Live site: https://cwhw.in

## Features

- Group study rooms (via a linked Discord server)
- Personal study room with a focus timer and video themes
- Doubt solving (Ask Doubts, Class Doubts)
- Mentor-led classes and talks (join, manage and view classes)
- Member profiles, followers and messaging
- Blog and community rules

## Tech

- Built on Wix with Velo (JavaScript), synced to this repo through Wix Git Integration
- `src/pages/`: code for each site page
- `src/public/`: shared code and custom elements (sign-in, focus timer, classes, doubts, video calls)
- `src/backend/`: server code, including the Discord integration and scheduled jobs

API keys are stored in the Wix Secrets Manager, not in this repo.
