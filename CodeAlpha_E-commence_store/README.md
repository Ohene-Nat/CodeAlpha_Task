# ShopSphere E-Commerce Web Application

Complete e-commerce application built with HTML5, CSS3, Vanilla JavaScript, Node.js, Express.js, and PostgreSQL.

## Features

- Responsive home page with search, categories, featured products, and latest products
- Product details page with gallery and quantity selector
- Shopping cart with persisted guest storage and authenticated API support
- JWT auth with registration, login, logout, and profile endpoints (session expires when browser closes)
- Login required to add items to cart
- Admin dashboard with user count, order management, and status updates
- User order cancellation for pending orders
- Checkout and order creation flow
- User dashboard and admin-facing API routes
- RESTful product, cart, and order endpoints
- PostgreSQL schema and sample seed data

## Folder Structure

- `src/config` database configuration
- `src/controllers` MVC controllers
- `src/middleware` auth and error handling
- `src/routes` Express routers
- `src/utils` helpers
- `public` frontend pages, CSS, and JS
- `sql` schema and seed scripts

## Setup

1. Copy `.env.example` to `.env` and update the values.
2. Create the PostgreSQL database.
3. Run `sql/schema.sql`.
4. Run `sql/seed.sql`.
5. Install dependencies with `npm install`.
6. Start the app with `npm run dev` or `npm start`.

## API Endpoints

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/profile`

### Products
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

### Cart
- `GET /api/cart`
- `POST /api/cart`
- `PUT /api/cart/:id`
- `DELETE /api/cart/:id`

### Orders
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`
- `PUT /api/orders/:id`

### Admin
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `PATCH /api/orders/:id/cancel` (user or admin, pending orders only)

## Admin Credentials

After running the database seed, create the admin account:

```bash
npm run seed:admin
```

- **Email:** admin@shopsphere.com
- **Password:** Admin@123

## Notes

- Admin-only product and order maintenance is protected by JWT role checks.
- Auth tokens are stored in sessionStorage and expire when the browser closes.
- Order statuses: `pending`, `delivered`, `cancelled`.
