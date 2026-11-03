<?php

use App\Http\Controllers\Api\TripController;
use Illuminate\Support\Facades\Route;

// API routes are automatically mounted under /api by Laravel.
// Sample trips can be read without logging in. Do not treat sample
// availability as real travel inventory.
Route::prefix('v1')->group(function () {
    Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'TravelConnect API']));
    Route::get('/trips', [TripController::class, 'index']);
    Route::get('/trips/{trip}', [TripController::class, 'show']);

    // Protected writes, payments, chat and live tracking must be added
    // only after authentication, driver verification and consent rules.
});
