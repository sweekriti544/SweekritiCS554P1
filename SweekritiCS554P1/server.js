const express = require('express');
const morgan = require('morgan');
const app = express();
app.use(morgan('combined'));

app.get('/convert', (req, res) => {
  const lbs = Number(req.query.lbs);
  if (req.query.lbs === undefined || Number.isNaN(lbs)) {
    return res.status(400).json({ error: 'Query param lbs is required and must be a number' });
  }
  if (!Number.isFinite(lbs) || lbs < 0) {
    return res.status(422).json({ error: 'lbs must be a non-negative, finite number' });
  }
  const kg = Math.round(lbs * 0.45359237 * 1000) / 1000;
  return res.json({ lbs, kg, formula: 'kg = lbs * 0.45359237' });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`listening on ${port}`));
