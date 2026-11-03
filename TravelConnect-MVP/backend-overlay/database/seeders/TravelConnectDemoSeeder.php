<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class TravelConnectDemoSeeder extends Seeder
{
    public function run(): void
    {
        $date = Carbon::tomorrow()->format('Y-m-d');
        // All values are fictional, and all public rows remain marked as sample data.
        $rows = [
            ['Thabo Mokoena','TM','Johannesburg','Durban','06:30','12:45',380,3,4.9,128,'Toyota Quantum','Park Station','Durban CBD'],
            ['Nomsa Khumalo','NK','Johannesburg','Durban','08:00','14:30',420,2,4.8,74,'Toyota Avanza','Park Station','Durban CBD'],
            ['Sipho Ndlovu','SN','Johannesburg','Pretoria','07:20','08:20',95,3,4.7,93,'Toyota Corolla','Sandton','Hatfield'],
            ['Anele Jacobs','AJ','Cape Town','Stellenbosch','10:30','11:30',120,2,4.9,113,'VW Polo','Cape Town CBD','Stellenbosch'],
        ];
        foreach ($rows as [$driver,$initials,$from,$to,$depart,$arrive,$fare,$seats,$rating,$reviews,$vehicle,$pickup,$dropoff]) {
            DB::table('trips')->updateOrInsert(
                ['driver_display_name' => $driver, 'origin' => $from, 'destination' => $to, 'departure_date' => $date],
                ['driver_initials' => $initials, 'departure_time' => $depart, 'arrival_time' => $arrive,
                 'price_per_seat' => $fare, 'seats_available' => $seats, 'illustrative_rating' => $rating,
                 'illustrative_reviews' => $reviews, 'vehicle_description' => $vehicle,
                 'pickup_location' => $pickup, 'dropoff_location' => $dropoff,
                 'has_aircon' => true, 'allows_luggage' => true, 'is_public_sample' => true,
                 'created_at' => now(), 'updated_at' => now()]
            );
        }
    }
}
