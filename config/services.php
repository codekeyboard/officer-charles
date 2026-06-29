<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'foundry' => [
        'endpoint' => env('FOUNDRY_ENDPOINT'),
        'api_key' => env('FOUNDRY_API_KEY'),
        'agent_id' => env('FOUNDRY_AGENT_ID'),
        'api_version' => env('FOUNDRY_API_VERSION', '1'),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-2.5-flash'),
        'fallback_model' => env('GEMINI_FALLBACK_MODEL', 'gemini-2.5-flash-lite'),
    ],

    'core_v2' => [
        'base_url' => env('CORE_V2_BASE_URL', 'http://127.0.0.1:8010'),
        'ws_public_url' => env('CORE_V2_WS_PUBLIC_URL', 'ws://127.0.0.1:8010'),
    ],

    'core_v3' => [
        'base_url' => env('CORE_V3_BASE_URL', 'http://127.0.0.1:8020'),
        'ws_public_url' => env('CORE_V3_WS_PUBLIC_URL', 'ws://127.0.0.1:8020'),
    ],

];
