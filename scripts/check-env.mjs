const required = ['LUMINA_CONNECTOR_TOKEN'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Lumina environment looks ready.');

