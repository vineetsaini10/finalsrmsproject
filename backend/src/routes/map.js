const router = require('express').Router();
const axios  = require('axios');
const { authenticate } = require('../middleware/auth');
const { setEx, get }   = require('../config/redis');

// GET /map/centers
router.get('/centers', authenticate, async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000, type } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

    const cacheKey = `map:centers:${lat}:${lng}:${radius}:${type || 'all'}`;
    const cached   = await get(cacheKey);
    if (cached) return res.json(cached);

    const typeMap = {
      recycling: 'recycling center',
      scrap:     'scrap dealer',
      ewaste:    'e-waste collection',
      organic:   'compost facility',
    };
    const keyword = typeMap[type] || 'waste management recycling';

    const gmapsRes = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: { location: `${lat},${lng}`, radius, keyword, key: process.env.GMAPS_API_KEY },
    });

    const centers = (gmapsRes.data.results || []).map(p => ({
      id:       p.place_id,
      name:     p.name,
      lat:      p.geometry.location.lat,
      lng:      p.geometry.location.lng,
      address:  p.vicinity,
      rating:   p.rating,
      open_now: p.opening_hours?.open_now,
      types:    p.types,
    }));

    const response = { centers };
    await setEx(cacheKey, 3600, response);
    res.json(response);
  } catch (err) { next(err); }
});

// GET /map/bins
router.get('/bins', authenticate, async (req, res, next) => {
  try {
    const { lat = 18.52, lng = 73.85 } = req.query;
    // Static demo data — in production: query MongoDB IoT collection
    const bins = [
      { id: '1', lat: +lat + 0.002, lng: +lng + 0.001, fill_percent: 87, type: 'mixed',  address: 'Main Market' },
      { id: '2', lat: +lat - 0.001, lng: +lng + 0.003, fill_percent: 45, type: 'dry',    address: 'Bus Stand' },
      { id: '3', lat: +lat + 0.004, lng: +lng - 0.002, fill_percent: 95, type: 'wet',    address: 'Vegetable Market' },
    ];
    res.json({ bins });
  } catch (err) { next(err); }
});

module.exports = router;
