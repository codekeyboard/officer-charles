<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_session_states', function (Blueprint $table) {
            $table->id();
            $table->string('visitor_id');
            $table->string('session_id');
            $table->string('experience');
            $table->string('mode')->nullable();
            $table->string('visa_type')->nullable();
            $table->json('state');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['visitor_id', 'session_id', 'experience']);
            $table->index(['visitor_id', 'experience', 'mode', 'visa_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_session_states');
    }
};
