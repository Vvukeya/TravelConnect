<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->string('driver_display_name', 100);
            $table->string('driver_initials', 4);
            $table->string('origin', 100)->index();
            $table->string('destination', 100)->index();
            $table->date('departure_date')->index();
            $table->time('departure_time');
            $table->time('arrival_time');
            $table->decimal('price_per_seat', 9, 2);
            $table->unsignedTinyInteger('seats_available');
            $table->string('vehicle_description', 100);
            $table->string('pickup_location', 160);
            $table->string('dropoff_location', 160);
            $table->decimal('illustrative_rating', 3, 1)->default(0);
            $table->unsignedInteger('illustrative_reviews')->default(0);
            $table->boolean('has_aircon')->default(false);
            $table->boolean('allows_luggage')->default(false);
            $table->boolean('is_public_sample')->default(true);
            $table->timestamps();
            $table->index(['origin','destination','departure_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trips');
    }
};
