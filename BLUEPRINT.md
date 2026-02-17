# Chess Game App - Complete Blueprint

## 🏗 Architecture
**Frontend**: React Native (Expo)
**Backend**: Node.js + Express
**Database**: MongoDB
**Real-time**: Socket.IO
**Auth**: JWT

## 📱 Frontend Structure (React Native)

###  Navigation (Bottom Tabs)
1. **Home**
   - User Profile (Avatar, Name)
   - Coin Balance
   - Game Modes:
     - *Play vs Computer* (AI Levels: Easy, Medium, Hard)
     - *Pass n Play* (Local Offline)
     - *Multiplayer* (Friends - Create/Join Room)
     - *Random* (Worldwide - Coin Stakes)
2. **Connection**
   - Pending Requests (Accept/Reject)
   - Connections List (Status, Stats)
3. **Daily Challenge**
   - 400 Preloaded Puzzles (Logic: `day_number % 400`)
   - Leaderboard (Time-based)
4. **Spin n Win**
   - 3-hour cooldown
   - Weighted probabilities for coins
5. **Settings**
   - Privacy Policy
   - How to Play
   - Share
   - Version Info

### 🔐 Authentication Flow
- **Sign Up**: Unique "Gaming Name", Email, Password.
- **Avatar Selection**: 8-12 Defaults, others locked.

## 🧱 Backend Structure (Node.js)

### Collections (MongoDB)
- `users`: { gamingName (unique), email, passwordHash, coins, avatarId, connections: [], stats: {...} }
- `games`: { players: [], moves: [], status, result, category }
- `connections`: { fromUser, toUser, status }
- `challenges`: { fen, solution, dateId }
- `transactions`: { userId, amount, type, date }
- `avatars`: { url, price, isPremium }
- `spin_logs`: { userId, timestamp, reward }

### API Endpoints (Planned)
- `POST /auth/signup`
- `POST /auth/login`
- `GET /user/profile`
- `POST /game/create` (Socket.IO for game events)
- `GET /challenge/daily`
- `POST /spin/claim`

## 🎨 Design System
- **Theme**: Premium, Glassmorphism, Dark Mode friendly.
- **Colors**: Vibrant gradients, not generic defaults.
- **Typography**: Modern Google Fonts (Inter/Outfit).
