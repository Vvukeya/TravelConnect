// TravelConnect v0.2 is served from the same origin as its authenticated REST API.
// Keep API requests on /api/v1 so HttpOnly session cookies work without CORS.
window.TRAVELCONNECT_API_BASE = '/api/v1';
