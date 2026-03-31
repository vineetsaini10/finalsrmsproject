const Worker = require('../models/Worker');

/**
 * Calculates the Haversine distance between two points in km.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Finds the best worker for a given complaint based on:
 * 1. Status (must be 'available')
 * 2. Ward (must match)
 * 3. Distance (nearer is better)
 * 4. Load (fewer tasks is better)
 */
async function findBestWorker(complaint) {
  const [lng, lat] = complaint.location.coordinates;
  const wardId = complaint.wardId;

  // Find available workers in the same ward
  const availableWorkers = await Worker.find({
    wardId,
    status: 'available',
    // Skip workers who are already busy (redundant due to status: 'available')
  }).lean();

  if (!availableWorkers.length) return null;

  // Calculate scores for each worker
  const candidates = availableWorkers.map(worker => {
    const [wLng, wLat] = worker.currentLocation.coordinates;
    const distance = calculateDistance(lat, lng, wLat, wLng);
    
    // Score formula: (Distance in KM * 10) + (Number of assigned tasks * 5)
    // Lower score is better
    const currentLoad = (worker.assignedTasks || []).length;
    const score = (distance * 10) + (currentLoad * 5);

    return { ...worker, distance, score };
  });

  // Sort by score ascending
  candidates.sort((a, b) => a.score - b.score);

  return candidates[0];
}

module.exports = {
  calculateDistance,
  findBestWorker,
};
