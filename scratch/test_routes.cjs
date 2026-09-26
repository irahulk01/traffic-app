const fs = require('fs');

async function test() {
  const apiKey = 'AIzaSyBPK7rtdV9pt0mXeJ2Kj9CyD8GKTYiMavQ';
  const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  
  const payload = {
    origin: {
      location: {
        latLng: { latitude: 23.3441, longitude: 85.3096 } // Ranchi
      }
    },
    destination: {
      location: {
        latLng: { latitude: 23.7441, longitude: 85.3096 } // ~50km North
      }
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
    extraComputations: ['TRAFFIC_ON_POLYLINE']
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory,routes.legs'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  fs.writeFileSync('routes_output.json', JSON.stringify(data, null, 2));
  console.log('Done, wrote to routes_output.json');
}
test();
