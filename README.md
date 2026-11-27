<p align="center">
  <img src="https://images.weserv.nl/?url=static.wixstatic.com/media/73c6a3_3f2c7739106c4ebc87a46c2f65c0c16c~mv2.png&w=600&h=600&bg=white&output=png" alt="CWHW.in logo" width="180">
</p>

<h1 align="center">CWHW.in (Classwork Homework)</h1>

<p align="center">
  An online collaborative learning platform for Indian school students, with 250+ registered users.<br>
  Built by Tanuj Yadav · <a href="https://cwhw.in">cwhw.in</a>
</p>

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
