<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiMessage extends Model
{
    protected $fillable = [
        'user_id',
        'visitor_id',
        'session_id',
        'role',
        'content',
        'agent_id',
        'mode',
        'visa_type',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
