<?php

use App\Http\Controllers\AiMessageController;
use Illuminate\Support\Facades\Route;

Route::get('/ai/messages', [AiMessageController::class, 'index']);
Route::post('/ai/messages', [AiMessageController::class, 'store']);
Route::post('/ai/restart', [AiMessageController::class, 'restart']);
Route::post('/ai/live-session', [AiMessageController::class, 'liveSession']);
