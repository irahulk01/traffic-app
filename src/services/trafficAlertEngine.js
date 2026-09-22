/**
 * Sudden Local Traffic Changes Engine (Hazaribagh Locality & District)
 * Generates and broadcasts sudden traffic change alerts for local chowks and corridors
 */

export const HAZARIBAGH_ALERT_LOCATIONS = [
  {
    id: 'hz-jhanda-chowk',
    name: 'Jhanda Chowk',
    corridor: 'Jhanda Chowk - Main Bazaar Link',
    landmark: 'Near Jhanda Chowk & Annada College More',
    coordinates: { lat: 23.9964, lng: 85.3586 },
    speedLimit: 30,
    typicalSpeed: 11,
    typicalDelay: '+18 mins delay',
    reasons: [
      'Sudden market rush and commercial vehicle congestion',
      'Heavy pedestrian crossing and narrow market bottlenecks',
      'Unscheduled tempo / auto stoppage near Annada College crossing',
    ],
  },
  {
    id: 'hz-matwari-junction',
    name: 'Matwari Junction',
    corridor: 'NH-33 Bypass (Matwari Axis)',
    landmark: 'Matwari Petrol Pump Junction',
    coordinates: { lat: 24.0044, lng: 85.3696 },
    speedLimit: 50,
    typicalSpeed: 14,
    typicalDelay: '+15 mins delay',
    reasons: [
      'Heavy freight truck bottleneck on NH-33 bypass',
      'Transit vehicle queue near Matwari petrol pump',
      'Slow moving long-haul transport trailers',
    ],
  },
  {
    id: 'hz-indrapuri-korrah',
    name: 'Indrapuri Chowk',
    corridor: 'Indrapuri Chowk - Korrah Road',
    landmark: 'Indrapuri Chowk & Korrah More',
    coordinates: { lat: 23.9864, lng: 85.3726 },
    speedLimit: 40,
    typicalSpeed: 16,
    typicalDelay: '+12 mins delay',
    reasons: [
      'Office and school transit surge near Korrah road',
      'Sudden high vehicle density at Indrapuri intersection',
      'Localized slowdown approaching Korrah crossing',
    ],
  },
  {
    id: 'hz-pelawal-chowk',
    name: 'Pelawal Chowk',
    corridor: 'Barhi Road - Pelawal Junction',
    landmark: 'Pelawal Market & Barhi Road Link',
    coordinates: { lat: 24.0164, lng: 85.3496 },
    speedLimit: 45,
    typicalSpeed: 15,
    typicalDelay: '+14 mins delay',
    reasons: [
      'Weekly market crowd spillover onto Barhi Road',
      'Commercial transport queue at Pelawal entry',
    ],
  },
  {
    id: 'hz-annada-college',
    name: 'Annada College More',
    corridor: 'Lake Road & Annada Axis',
    landmark: 'Annada High School & College Crossing',
    coordinates: { lat: 23.9912, lng: 85.3634 },
    speedLimit: 30,
    typicalSpeed: 12,
    typicalDelay: '+16 mins delay',
    reasons: [
      'Student transit rush and localized two-wheeler congestion',
      'Traffic bottleneck at Lake Road junction',
    ],
  },
  {
    id: 'hz-demotand-nh33',
    name: 'Demotand Crossing',
    corridor: 'Demotand NH-33 Interchange',
    landmark: 'Demotand Crossing & Ranchi Highway',
    coordinates: { lat: 23.9644, lng: 85.3756 },
    speedLimit: 60,
    typicalSpeed: 20,
    typicalDelay: '+11 mins delay',
    reasons: [
      'Interstate bus and truck queue at Ranchi highway junction',
      'Slow movement near Demotand toll approach',
    ],
  },
];

let alertCounter = 0;

/**
 * Generate a sudden local traffic change alert for a Hazaribagh location
 */
export function generateSuddenTrafficAlert() {
  const index = alertCounter % HAZARIBAGH_ALERT_LOCATIONS.length;
  alertCounter++;

  const loc = HAZARIBAGH_ALERT_LOCATIONS[index];
  const reason = loc.reasons[Math.floor(Math.random() * loc.reasons.length)];
  const delayMins = 12 + Math.floor(Math.random() * 10);
  const crawlSpeed = 9 + Math.floor(Math.random() * 6);

  return {
    id: `sudden-${loc.id}-${Date.now()}`,
    locationId: loc.id,
    locationName: loc.name,
    corridorName: loc.corridor,
    landmark: loc.landmark,
    coordinates: loc.coordinates,
    level: 'heavy',
    statusLevel: 'heavy',
    badgeText: 'SUDDEN HIGH TRAFFIC',
    speed: crawlSpeed,
    speedLimit: loc.speedLimit,
    delay: `+${delayMins} mins delay`,
    delayMinutes: delayMins,
    advisory: reason,
    timestamp: Date.now(),
    formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Audio beep alert for mobile phone using Web Audio API (no external audio files required)
 */
export function playAlertChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio autoplay restrictions on some mobile browsers
  }
}
