'use strict';

const https = require('https');

const likesByStock = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || '';
}

function normalizeStockSymbol(symbol) {
  return String(symbol || '').trim().toUpperCase();
}

function fetchStockQuote(symbol) {
  return new Promise((resolve, reject) => {
    const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${encodeURIComponent(symbol)}/quote`;

    https
      .get(url, (response) => {
        let raw = '';

        response.on('data', (chunk) => {
          raw += chunk;
        });

        response.on('end', () => {
          try {
            const data = JSON.parse(raw);
            resolve(data);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', (err) => reject(err));
  });
}

function getLikeCount(stock) {
  const entry = likesByStock.get(stock);
  return entry ? entry.size : 0;
}

function recordLike(stock, ip) {
  if (!likesByStock.has(stock)) {
    likesByStock.set(stock, new Set());
  }

  likesByStock.get(stock).add(ip);
  return getLikeCount(stock);
}

async function buildStockData(stock, ip, like) {
  const normalized = normalizeStockSymbol(stock);

  if (!normalized) {
    return {
      stock: normalized,
      price: 'invalid',
      likes: 0,
    };
  }

  let quote;
  try {
    quote = await fetchStockQuote(normalized);
  } catch (err) {
    return {
      stock: normalized,
      price: 'invalid',
      likes: 0,
    };
  }

  const price = typeof quote?.latestPrice === 'number' ? quote.latestPrice : 'invalid';
  if (price === 'invalid') {
    return {
      stock: normalized,
      price,
      likes: 0,
    };
  }

  const likes = like ? recordLike(normalized, ip) : getLikeCount(normalized);

  return {
    stock: normalized,
    price,
    likes,
  };
}

module.exports = function (app) {
  app.route('/api/stock-prices').get(async function (req, res) {
    const like = req.query.like === 'true';
    const ip = getClientIp(req);
    const stockQuery = req.query.stock;

    const stocks = Array.isArray(stockQuery) ? stockQuery : [stockQuery];
    const normalizedStocks = stocks.filter((value) => value !== undefined);

    if (normalizedStocks.length === 0) {
      return res.status(400).json({ error: 'stock query required' });
    }

    const limitedStocks = normalizedStocks.slice(0, 2);

    try {
      const data = await Promise.all(
        limitedStocks.map((stock) => buildStockData(stock, ip, like))
      );

      if (data.length === 1) {
        return res.json({ stockData: data[0] });
      }

      const [first, second] = data;
      const relLikesFirst = first.likes - second.likes;
      const relLikesSecond = second.likes - first.likes;

      return res.json({
        stockData: [
          {
            stock: first.stock,
            price: first.price,
            rel_likes: relLikesFirst,
          },
          {
            stock: second.stock,
            price: second.price,
            rel_likes: relLikesSecond,
          },
        ],
      });
    } catch (err) {
      return res.status(500).json({ error: 'internal error' });
    }
  });
};
