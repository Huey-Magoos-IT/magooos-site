// Sample location data to use during development and testing
export const SAMPLE_LOCATIONS = [
  {
    "id": "4145",
    "name": "North Side Store"
  },
  {
    "id": "4849",
    "name": "Downtown Center"
  },
  {
    "id": "5561",
    "name": "Westfield Mall"
  },
  {
    "id": "9905",
    "name": "Eastside Plaza"
  },
  {
    "id": "4167",
    "name": "Harbor View"
  },
  {
    "id": "4249",
    "name": "Central District"
  },
  {
    "id": "4885",
    "name": "Southgate Market"
  },
  {
    "id": "7025",
    "name": "Lakeview Commons"
  },
  {
    "id": "4255",
    "name": "Riverside Center"
  },
  {
    "id": "4878",
    "name": "Mountain View Mall"
  },
  {
    "id": "4045",
    "name": "Parkside Galleria"
  },
  {
    "id": "4872",
    "name": "Sunset Plaza"
  },
  {
    "id": "4166",
    "name": "Meadows Shopping Center"
  },
  {
    "id": "4868",
    "name": "Oakwood Mall"
  },
  {
    "id": "4887",
    "name": "Highland Center"
  }
];

// Export a function that mocks the API response format
export const getMockLocationsResponse = () => ({
  locations: SAMPLE_LOCATIONS,
  count: SAMPLE_LOCATIONS.length
});