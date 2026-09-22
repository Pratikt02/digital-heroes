# 🦸 Digital Heroes

**Digital Heroes** is a full-stack charity rewards platform that combines subscription-based participation, charity selection, score tracking, draw eligibility, and automated reward draws.

Users can subscribe to a plan, choose a charity, store their scores, become eligible for upcoming draws, and track their participation through a personalized dashboard.

🌐 **Live Demo:** https://digital-heroes-red.vercel.app/
💻 **Source Code:** https://github.com/Pratikt02/digital-heroes

---

## ✨ Features

### 👤 User Features

* User registration and login
* JWT-based authentication with HTTP-only cookies
* User dashboard
* Subscription management
* Monthly and yearly subscription plans
* Razorpay subscription integration
* Charity selection
* Score storage and tracking
* Automatic draw eligibility calculation
* Draw status tracking
* Published draw participation
* Winner and result display

### 💳 Subscription & Payment System

* Razorpay subscription integration
* Monthly and yearly plans
* Secure payment processing
* Subscription activation through Razorpay webhooks
* Subscription status tracking
* Test-mode payment integration
* Automatic synchronization between Razorpay and the application

### 🎯 Draw System

* Score-based draw eligibility
* Minimum 5 stored scores required for eligibility
* Automated draw processing
* Draw publishing
* Winner selection
* Winner proof/image management
* User draw status tracking

### 👨‍💼 Admin Features

* Admin authentication
* Admin dashboard
* Draw management
* Create and manage draws
* Publish draws
* Winner management
* Winner proof management
* User and subscription monitoring

---

## 🔄 Application Flow

```text
User Registration
       ↓
User Login
       ↓
Choose Subscription
       ↓
Razorpay Payment
       ↓
Subscription Activated
       ↓
Choose Charity
       ↓
Store 5 Scores
       ↓
Eligible for Next Draw
       ↓
Published Draw
       ↓
Winner Selection
       ↓
Winner / Proof Display
```

---

## 📊 Draw Eligibility

A user becomes eligible for the next draw after completing the required requirements:

* ✅ Active subscription
* ✅ Charity selected
* ✅ 5 scores stored

The dashboard displays the user's current eligibility status.

Example:

```text
Draw Status

You are eligible for the next draw.

Published draws entered: 0
Scores stored: 5/5
```

---

## 🛠️ Tech Stack

### Frontend

* React
* JavaScript
* Vite
* CSS

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication

### Payment & External Services

* Razorpay — subscriptions and payments
* Cloudinary — winner proof/image storage
* Vercel — deployment

### Development Tools

* Git
* GitHub
* npm
* Vercel CLI

---

## 🏗️ Project Structure

```text
digital-heroes/
│
├── client/
│   ├── src/
│   ├── public/
│   └── vite.config.js
│
├── server/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── ...
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

# 🚀 Local Development

## Prerequisites

Make sure you have installed:

* Node.js 18+
* npm
* MongoDB / MongoDB Atlas
* Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/Pratikt02/digital-heroes.git
```

Navigate into the project:

```bash
cd digital-heroes
```

---

## 2. Install Dependencies

```bash
npm install
```

If the backend and frontend have separate dependencies, install them according to the project structure.

---

## 3. Configure Environment Variables

Create your environment file:

```bash
cp .env.example .env
```

Then configure the required variables.

### Example

```env
NODE_ENV=development
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_long_random_secret
JWT_EXPIRES_DAYS=7

CLIENT_URL=http://localhost:5173

RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

RAZORPAY_PLAN_MONTHLY=your_monthly_plan_id
RAZORPAY_PLAN_YEARLY=your_yearly_plan_id

CRON_SECRET=your_cron_secret
DRAW_DEFAULT_MODE=random

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

> ⚠️ **Never commit your `.env` file to GitHub.**
>
> Never expose MongoDB credentials, Razorpay secrets, JWT secrets, webhook secrets, Cloudinary secrets, or cron secrets.

---

## 4. Start the Development Server

```bash
npm run dev
```

The backend API runs on:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

---

# 👨‍💼 Admin Setup

The project includes an admin account creation script.

Create an admin locally using your own credentials:

### Windows PowerShell

```powershell
$env:ADMIN_EMAIL="your-admin-email@example.com"
$env:ADMIN_PASSWORD="your-secure-password"
npm run create-admin
```

### Linux / macOS

```bash
ADMIN_EMAIL=your-admin-email@example.com ADMIN_PASSWORD=your-secure-password npm run create-admin
```

> ⚠️ Do not put real admin credentials in this README or commit them to GitHub.

---

# 🔐 Authentication API

| Method | Endpoint           | Authentication | Description                                                  |
| ------ | ------------------ | -------------- | ------------------------------------------------------------ |
| `POST` | `/api/auth/signup` | None           | Create a new subscriber and set authentication cookie        |
| `POST` | `/api/auth/login`  | None           | Authenticate a user and set authentication cookie            |
| `POST` | `/api/auth/logout` | None           | Log out the current user and clear the authentication cookie |
| `GET`  | `/api/auth/me`     | Cookie         | Return the currently authenticated user                      |

### Authentication Flow

```text
Signup / Login
      ↓
HTTP-only Authentication Cookie
      ↓
GET /api/auth/me
      ↓
Authenticated User
      ↓
Protected API Routes
```

---

# 💳 Razorpay Integration

Digital Heroes uses Razorpay for subscription payments.

The application supports:

* Monthly subscriptions
* Yearly subscriptions
* Razorpay checkout
* Subscription activation
* Webhook-based subscription updates
* Subscription status synchronization

### Payment Flow

```text
User selects plan
       ↓
Razorpay subscription
       ↓
Payment
       ↓
Razorpay webhook
       ↓
Backend verifies event
       ↓
Database subscription update
       ↓
Dashboard shows Active
```

The application uses **Razorpay test mode** for development/testing.

---

# ☁️ Cloudinary Integration

Cloudinary is used to store winner proof images/screenshots.

The backend uploads proof images to Cloudinary and stores the relevant information for displaying winner proof in the application.

---

# 🎯 Draw System

The draw system uses user eligibility information to determine participation in upcoming draws.

### Eligibility Requirements

```text
Active Subscription
       +
Selected Charity
       +
5 Stored Scores
       ↓
Eligible for Next Draw
```

The system can process draws using the configured draw mode:

```env
DRAW_DEFAULT_MODE=random
```

The draw workflow includes:

1. Determine eligible users
2. Create/process a draw
3. Select winner
4. Publish the draw
5. Store winner information
6. Display the result to users

---

# 🌐 Deployment

The production application is deployed using **Vercel**.

### Live Application

👉 https://digital-heroes-red.vercel.app/

### GitHub Repository

👉 https://github.com/Pratikt02/digital-heroes

Production environment variables are configured through the Vercel project settings.

---

# 🔒 Security

The application uses several security practices:

* JWT-based authentication
* HTTP-only authentication cookies
* Environment variables for secrets
* Razorpay webhook verification
* Protected API routes
* Role-based admin functionality
* Server-side authentication checks
* Secrets excluded from Git using `.gitignore`

Sensitive credentials are never intended to be committed to the repository.

---

# 🧪 Testing

The production flow has been tested for:

* ✅ User registration/login
* ✅ Subscription activation
* ✅ Razorpay integration
* ✅ Razorpay webhook processing
* ✅ Subscription status synchronization
* ✅ Charity selection
* ✅ Score storage
* ✅ 5/5 score eligibility requirement
* ✅ Draw eligibility status
* ✅ Vercel production deployment

---

# 📌 Example User Journey

```text
1. User creates an account
          ↓
2. User logs in
          ↓
3. User selects a subscription
          ↓
4. User completes Razorpay payment
          ↓
5. Subscription becomes active
          ↓
6. User chooses a charity
          ↓
7. User stores 5 scores
          ↓
8. User becomes eligible for the next draw
          ↓
9. Published draw is entered
          ↓
10. Winner is selected
          ↓
11. Winner information/proof is displayed
```


# 📚 API Health Check

The backend provides a health-check endpoint:

```http
GET /api/health
```

Local development:

```text
http://localhost:5000/api/health
```

---

# 👨‍💻 Author

**Pratik Thange**

GitHub:
https://github.com/Pratikt02

---

# 📄 License

This project was developed for educational and portfolio purposes.
