require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const app = require('./app');
const pool = require('./db');

const PORT = process.env.PORT || 3000;

pool.connect()
  .then(client => {
    client.release();
    console.log('Database connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  });
