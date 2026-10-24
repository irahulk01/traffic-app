require('dotenv').config();
const express = require('express');
const app = express();
app.use('/api/traffic', require('./routes/traffic.cjs'));
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Traffic backend running on port ${PORT}`));
