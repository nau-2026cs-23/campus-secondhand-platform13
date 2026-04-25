# 校园好物 - Campus Marketplace
#校园二手交易平台
A full-stack campus second-hand trading platform built for verified students and faculty.

## Project Structure

```
.
├── backend/
│   ├── config/
│   │   ├── constants.ts       # JWT, server config
│   │   ├── passport.ts        # JWT + Local auth strategies
│   │   └── s3.ts              # AWS S3 config
│   ├── db/
│   │   ├── index.ts           # Drizzle DB connection
│   │   ├── schema.ts          # All table definitions + Zod schemas
│   │   └── migrations/
│   │       ├── 0_init_add_user_model.sql
│   │       └── 1773471919769_campus_marketplace.sql
│   ├── middleware/
│   │   ├── auth.ts            # authenticateJWT, authenticateLocal
│   │   └── errorHandler.ts
│   ├── repositories/
│   │   ├── users.ts           # User CRUD
│   │   ├── products.ts        # Product CRUD + favorites
│   │   ├── messages.ts        # Chat messages
│   │   ├── reports.ts         # Reports
│   │   ├── announcements.ts   # Announcements
│   │   └── upload.ts
│   ├── routes/
│   │   ├── auth.ts            # /api/auth/* (signup, login, me, PUT me)
│   │   ├── products.ts        # /api/products/*
│   │   ├── messages.ts        # /api/messages/*
│   │   ├── reports.ts         # /api/reports
│   │   ├── admin.ts           # /api/admin/* (admin-only)
│   │   └── upload.ts
│   └── server.ts              # Express entry point
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── custom/
│       │   │   ├── Login.tsx          # Login page
│       │   │   ├── Signup.tsx         # Signup page
│       │   │   ├── HomePage.tsx       # Product listing + hero + categories
│       │   │   ├── ProductDetailPage.tsx  # Product detail + report
│       │   │   ├── PublishPage.tsx    # 4-step publish form
│       │   │   ├── MessagesPage.tsx   # Chat interface
│       │   │   ├── ProfilePage.tsx    # User profile + my products
│       │   │   ├── AdminDashboard.tsx # Admin panel
│       │   │   └── OmniflowBadge.tsx
│       │   └── ui/                   # shadcn/ui components
│       ├── contexts/
│       │   └── AuthContext.tsx        # JWT auth state
│       ├── lib/
│       │   ├── api.ts                # All API call functions
│       │   └── utils.ts
│       ├── pages/
│       │   └── Index.tsx             # Main app shell + navigation
│       ├── types/
│       │   └── index.ts              # All TypeScript types
│       ├── config/
│       │   └── constants.ts          # API_BASE_URL
│       ├── App.tsx                   # HashRouter + AuthProvider + routes
│       └── index.css                 # Campus Fresh theme (teal primary)
```

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, shadcn/ui, React Router DOM (HashRouter)
- **Backend**: Express.js, TypeScript, Drizzle ORM, Passport.js (JWT + Local)
- **Database**: PostgreSQL
- **Auth**: JWT tokens stored in localStorage

## Key Features

1. **Authentication** - Signup/Login with JWT, role-based (user/admin)
2. **Product Browsing** - Category filter, search, sort, pagination
3. **Product Detail** - Multi-image gallery, seller info, report modal
4. **Publish Flow** - 4-step form (images → info → price → submit)
5. **Messaging** - Real-time-like chat with quick replies
6. **Profile Center** - My products with status tracking, settings
7. **Admin Dashboard** - Stats, product review, report handling, user management, announcements
8. **Announcements** - Admin-published banners shown on homepage
9. **Favorites** - Toggle favorite on products

## API Routes

- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login (returns JWT)
- `GET /api/auth/me` - Current user
- `PUT /api/auth/me` - Update profile
- `GET /api/products` - List approved products (public)
- `GET /api/products/my` - My products (auth)
- `POST /api/products` - Create product (auth)
- `PUT /api/products/:id` - Update product (owner)
- `POST /api/products/:id/favorite` - Toggle favorite (auth)
- `GET /api/messages/conversations` - Conversation list (auth)
- `GET /api/messages/:userId` - Get conversation (auth)
- `POST /api/messages` - Send message (auth)
- `POST /api/reports` - Create report (auth)
- `GET /api/announcements` - Active announcements (public)
- `GET /api/admin/*` - Admin endpoints (admin role required)

## Database Tables

- `Users` - Extended with role, isVerified, creditScore, isBanned
- `Products` - Listings with status workflow (pending→approved/rejected→sold)
- `Messages` - Chat messages between users
- `Reports` - User reports on products
- `Announcements` - Admin announcements
- `Favorites` - User-product favorites
- `Uploads` - S3 file uploads

## Code Generation Guidelines

- All navigation via `AppView` type in `Index.tsx`
- API calls via functions in `frontend/src/lib/api.ts`
- Types defined in `frontend/src/types/index.ts`
- Admin routes require `role === 'admin'` on user object
- Products go through pending→approved workflow before showing publicly
- Use `authenticateJWT` middleware for protected backend routes
