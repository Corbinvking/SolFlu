// Gaussian random for more realistic distribution
function gaussianRandom(mean = 0, stdev = 1) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

// Generate spread points with realistic clustering
export function generateSpreadPoints(center, config = {}) {
  const {
    minPoints = 25,
    maxPoints = 35,
    baseRadius = 0.8,
    weightFalloff = 0.4,
    clusterProbability = 0.7
  } = config;

  const numPoints = Math.floor(minPoints + Math.random() * (maxPoints - minPoints));
  const points = [];

  for (let i = 0; i < numPoints; i++) {
    const isCluster = Math.random() < clusterProbability;
    
    const distance = isCluster ? 
      gaussianRandom(0, baseRadius * 0.3) : 
      gaussianRandom(0, baseRadius);
    
    const angle = Math.random() * Math.PI * 2;
    
    const point = {
      coordinates: [
        center[0] + distance * Math.cos(angle),
        center[1] + distance * Math.sin(angle)
      ],
      weight: Math.max(0.4, 1 - (distance / baseRadius) * weightFalloff)
    };
    
    points.push(point);
  }

  // Add center point with maximum weight
  points.push({
    coordinates: center,
    weight: 1.2
  });

  return points;
}

// Generate initial outbreak locations
export function generateOutbreakPoints(center, numOutbreaks = 2) { // Reduced from 3 to 2
  const outbreaks = [];
  const minDistance = 0.5; // Reduced from 2 to 0.5 degrees
  const maxDistance = 1.5; // Reduced from 5 to 1.5 degrees

  for (let i = 0; i < numOutbreaks; i++) {
    let valid = false;
    let point;

    while (!valid) {
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      const angle = Math.random() * Math.PI * 2;
      
      point = {
        coordinates: [
          center[0] + distance * Math.cos(angle),
          center[1] + distance * Math.sin(angle)
        ],
        weight: 0.8 + Math.random() * 0.2 // Increased base weight
      };

      valid = outbreaks.every(existing => 
        Math.hypot(
          existing.coordinates[0] - point.coordinates[0],
          existing.coordinates[1] - point.coordinates[1]
        ) > minDistance * 0.7 // Reduced minimum separation
      );
    }

    outbreaks.push(point);
  }

  return outbreaks;
} 