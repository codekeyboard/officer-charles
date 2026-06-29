<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiSessionState extends Model
{
    protected $fillable = [
        'visitor_id',
        'session_id',
        'experience',
        'mode',
        'visa_type',
        'state',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'state' => 'array',
            'completed_at' => 'datetime',
        ];
    }
}
