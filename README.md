# EcommerceStore

**Task 1: Simple E-commerce Store**

## Features
- Product listing with search and category filter
- Product details page with stock status
- Shopping cart (quantity change, remove, free delivery over ৳3,000)
- Order processing (stock check + transaction, order history)
- User registration and login (bcrypt + JWT)

## Tech stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: SQLite (built-in node:sqlite, Node.js 22.13+ required)

## Run locally
```bash
npm install
npm start
```
Open http://localhost:3000

## API
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | /api/register, /api/login | no | Create account / log in |
| GET | /api/products?q=&category= | no | List / search products |
| GET | /api/products/:id | no | Product details |
| POST | /api/orders | yes | Place an order |
| GET | /api/orders | yes | My orders |

## Screenshots
Add your screenshots here.
