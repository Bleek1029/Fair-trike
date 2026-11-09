// --- Helper functions for map operations ---

export const OSM_ROUTE_BASE = "https://www.openstreetmap.org/directions";

// Open OpenStreetMap directions in a new tab
export async function openOSMRoute(start, end, opts = {}) {
  if (!opts) opts = {};
  var mode = opts.mode || "driving";
  var code = "car";
  if (mode === "walking") code = "foot";
  if (mode === "cycling") code = "bicycle";
  var lat1 = encodeURIComponent(start.lat);
  var lng1 = encodeURIComponent(start.lng);
  var lat2 = encodeURIComponent(end.lat);
  var lng2 = encodeURIComponent(end.lng);
  var sep = String.fromCharCode(38);
  var url = OSM_ROUTE_BASE + "?engine=fossgis_osrm" + sep + code + "=" + lat1 + "%2C" + lng1 + "%3B" + lat2 + "%2C" + lng2;
  window.open(url, "_blank", "noopener,noreferrer");
  return url;
}

// --- Debugging helpers ---

/**
 * Wrap an onClick handler to add debugging.
 * Logs the click and optionally breaks execution with debugger.
 * Usage: onClick={debugOnClick(() => myFunction())}
 */
export function debugOnClick(handler) {
  return function(event) {
    console.debug('Button clicked:', event.target);
    console.debug('Event target tagName:', event.target.tagName);
    console.debug('Event target className:', event.target.className);
    debugger; // Breaks execution in DevTools
    if (handler) {
      handler(event);
    }
  };
}

/**
 * Logs button click information without breaking execution.
 * Usage: onClick={debugOnClickSimple(() => myFunction)}
 */
export function debugOnClickSimple(handler) {
  return function(event) {
    console.debug('Button clicked:', event.target?.tagName, event.target?.className, event.target?.id);
    if (handler) {
      handler(event);
    }
  };
}
