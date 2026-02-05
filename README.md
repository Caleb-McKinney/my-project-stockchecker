# Stock Price Checker

This is the boilerplate for the Stock Price Checker project. Instructions for building your project can be found at https://freecodecamp.org/learn/information-security/information-security-projects/stock-price-checker

## Running locally

1. Install dependencies.
2. Start the server.

```bash
npm install
npm start
```

The app listens on `http://localhost:3000` by default.

## API usage

Single stock:

```
GET /api/stock-prices?stock=GOOG
GET /api/stock-prices?stock=GOOG&like=true
```

Two stocks:

```
GET /api/stock-prices?stock=GOOG&stock=MSFT
GET /api/stock-prices?stock=GOOG&stock=MSFT&like=true
```

The `like=true` flag only counts once per client IP per stock.
