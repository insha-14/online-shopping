# Insha's Online Shopping Cart Management System

A beginner-friendly mini project built with HTML, CSS, JavaScript, Node.js/Express and MySQL.

## Features
- Display products with category, price and stock.
- Add products to a customer's cart.
- Update quantities and remove cart items.
- Place an order and reduce product stock.
- View previous orders.
- Add products to the catalogue.
- Register a customer through the API (passwords are hashed).

## 1. Install requirements
Install Node.js and MySQL. Open this project folder in VS Code.

## 2. Create the database
1. Open MySQL Workbench or phpMyAdmin.
2. Open `schema.sql`.
3. Execute the complete SQL script. It creates the `shopping_cart` database, tables and sample products.

The required tables from the project brief are `users`, `products`, `cart`, and `orders`. An additional `order_items` table is included so each order retains a record of the products purchased.

## 3. Configure database connection
1. Copy `.env.example` and rename the copy to `.env`.
2. Enter your MySQL username and password in `.env`.
3. Keep `DB_NAME=shopping_cart`.

Example:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=shopping_cart
PORT=3000
```

## 4. Install packages and run
Open the VS Code terminal in this folder and run:

```
npm install
npm start
```

Open `http://localhost:3000` in your browser.

## 5. Use the website
1. Create a customer in the database (or register using the API below).
2. Enter that customer's numeric `user_id` in the Customer ID box.
3. Add products, update quantities, and place an order.

Register endpoint:
- Method: `POST`
- URL: `http://localhost:3000/api/register`
- JSON body:
```
{
  "name": "Demo Customer",
  "email": "demo@example.com",
  "password": "demo123",
  "phone": "9876543210"
}
```
The response contains the new `user_id`. Use that ID in the website.

## API overview
- `GET /api/products` – list products
- `POST /api/products` – add product
- `PUT /api/products/:id` – update product
- `DELETE /api/products/:id` – delete product
- `POST /api/register` – register customer
- `POST /api/cart` – add item to cart
- `GET /api/cart/:userId` – view cart
- `PUT /api/cart/:cartId` – change quantity
- `DELETE /api/cart/:cartId` – remove cart item
- `POST /api/orders` – place order
- `GET /api/orders/:userId` – view order history

## GitHub upload
Create a new GitHub repository, then run these commands in the VS Code terminal:

```
git init
git add .
git commit -m "Create online shopping cart management system"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Do not upload your real `.env` file or database password. The `.gitignore` file excludes it.
