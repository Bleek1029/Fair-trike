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
