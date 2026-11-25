const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { resolve } = require('../config/consul');

const router = express.Router();

const routes = [
  { prefix: '/api/matchings', service: 'matching-recommendation-service', rewrite: '/api/matchings' },
  { prefix: '/api/recommendations', service: 'matching-recommendation-service', rewrite: '/api/recommendations' }
];

routes.forEach(({ prefix, service, rewrite }) => {
  router.use(
    prefix,
    createProxyMiddleware({
      target: 'http://placeholder',
      changeOrigin: true,
      pathRewrite: { [`^${prefix}`]: rewrite },
      router: () => resolve(service),
      onError: (err, req, res) => {
        console.error(`[gateway] ${service} :`, err.message);
        res.status(502).json({ error: `${service} indisponible` });
      }
    })
  );
});

module.exports = router;
