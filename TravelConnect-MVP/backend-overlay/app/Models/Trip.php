<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Trip extends Model
{
    protected $fillable = [
        'driver_display_name', 'driver_initials', 'origin', 'destination',
        'departure_date', 'departure_time', 'arrival_time', 'price_per_seat',
        'seats_available', 'vehicle_description', 'pickup_location', 'dropoff_location',
        'has_aircon', 'allows_luggage', 'is_public_sample',
    ];

    protected $casts = [
        'departure_date' => 'date',
        'price_per_seat' => 'decimal:2',
        'seats_available' => 'integer',
        'illustrative_rating' => 'decimal:1',
        'illustrative_reviews' => 'integer',
        'has_aircon' => 'boolean',
        'allows_luggage' => 'boolean',
        'is_public_sample' => 'boolean',
    ];
}
