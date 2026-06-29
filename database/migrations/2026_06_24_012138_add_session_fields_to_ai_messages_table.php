<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_messages', function (Blueprint $table) {
            $table->string('visitor_id')->nullable()->after('user_id');
            $table->string('session_id')->nullable()->after('visitor_id');
            $table->timestamp('completed_at')->nullable()->after('mode');

            $table->index(['visitor_id', 'session_id', 'mode', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('ai_messages', function (Blueprint $table) {
            $table->dropIndex(['visitor_id', 'session_id', 'mode', 'created_at']);
            $table->dropColumn(['visitor_id', 'session_id', 'completed_at']);
        });
    }
};
