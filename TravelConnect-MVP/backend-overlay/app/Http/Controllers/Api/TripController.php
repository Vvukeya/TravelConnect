<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TripController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $input = $request->validate([
            'from' => ['nullable', 'string', 'max:100'],
            'to' => ['nullable', 'string', 'max:100'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'seats' => ['nullable', 'integer', 'min:1', 'max:8'],
        ]);

        $trips = Trip::query()
            ->where('is_public_sample', true)
            ->when(isset($input['from']), fn ($q) => $q->where('origin', $input['from']))
            ->when(isset($input['to']), fn ($q) => $q->where('destination', $input['to']))
            ->when(isset($input['date']), fn ($q) => $q->whereDate('departure_date', $input['date']))
            ->when(isset($input['seats']), fn ($q) => $q->where('seats_available', '>=', $input['seats']))
            ->orderBy('departure_time')
            ->limit(50)
            ->get()
            ->map(fn ($trip) => $this->formatTrip($trip));

        return response()->json(['data' => $trips, 'sample_data' => true]);
    }

    public function show(Trip $trip): JsonResponse
    {
        abort_unless($trip->is_public_sample, 404);
        return response()->json(['data' => $this->formatTrip($trip), 'sample_data' => true]);
    }

    private function formatTrip(Trip $trip): array
    {
        return [
            'id' => (string) $trip->id,
            'driver' => $trip->driver_display_name,
            'initials' => $trip->driver_initials,
            'from' => $trip->origin,
            'to' => $trip->destination,
            'date' => $trip->departure_date->format('Y-m-d'),
            'depart' => substr($trip->departure_time, 0, 5),
            'arrive' => substr($trip->arrival_time, 0, 5),
            'price' => (float) $trip->price_per_seat,
            'seats' => $trip->seats_available,
            'rating' => (float) $trip->illustrative_rating,
            'reviews' => $trip->illustrative_reviews,
            'vehicle' => $trip->vehicle_description,
            'pickup' => $trip->pickup_location,
            'dropoff' => $trip->dropoff_location,
            'verified' => false,
            'ac' => $trip->has_aircon,
            'luggage' => $trip->allows_luggage,
            'source' => 'sample',
        ];
    }
}
