/*

Latitude: How far North/South of the equator a location is 
    • 90 to -90 
Longitude: How far East/West 
    • 180 to -180

The Problem: Converting angles into a 3d point in space 
        Lat: 43.2        ------>  x,y,z
        Long: 90.7

Right now sphere is (0,0,0) with a radius of 1 
    •  x^2 + y^2 + z^2 = 1
    • Ex (0,0,1) -> 0^2 + 0^2 + 1^2  = 1


r = radius, distance from origin
phi = latitude, elevation angle measured relative to xz plane (equator)
lambda = longitude, within the xz plane (starting from positive z to positive x)


*/


//Ex. 90 * pi/180 = pi/2
const DEGREES_TO_RADIANS = Math.PI / 180;


// using optional radius as 1 for a world 'unit'
export function latLonToCartesian(latitude, longitude, radius = 1) {

  const lat = latitude * DEGREES_TO_RADIANS;
  const lon = longitude * DEGREES_TO_RADIANS;

  const x = radius * Math.cos(lat) * Math.sin(lon);
  const y = radius * Math.sin(lat);
  const z = radius * Math.cos(lat) * Math.cos(lon);

  // returning array to use for a vector class later if needed
  return [x, y, z];
}



