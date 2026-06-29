<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return inertia('welcome', ['messages' => []]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('visa-ai', 'visa-ai', ['messages' => []])->name('visa-ai');
});

require __DIR__.'/settings.php';
