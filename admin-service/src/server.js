const app = require('./app');
const logger = console;

const PORT = process.env.PORT || 3007;

app.listen(PORT, () => {
  logger.log(`Admin Service running on port ${PORT}`);
});

