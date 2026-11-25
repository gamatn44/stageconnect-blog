const Consul = require('consul');

const consul = new Consul({
  host: process.env.CONSUL_HOST || 'localhost',
  port: process.env.CONSUL_PORT || 8500
});

async function resolve(serviceName) {
  const nodes = await consul.health.service({
    service: serviceName,
    passing: true
  });

  if (!nodes.length) {
    throw new Error(`Aucune instance saine de ${serviceName}`);
  }

  const { Address, Port } =
    nodes[Math.floor(Math.random() * nodes.length)].Service;

  return `http://${Address}:${Port}`;
}

module.exports = { resolve };
