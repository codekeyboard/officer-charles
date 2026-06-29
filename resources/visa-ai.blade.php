<!DOCTYPE html>
<html lang="en" class="">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Visa AI - Officer Charles</title>
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    </head>
    <body class="font-sans antialiased bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
        <header class="w-full border-b border-[#e3e3e0] dark:border-[#3E3E3A] bg-white dark:bg-[#161615]">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16 items-center">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-lg">Officer Charles</span>
                    </div>
                    <nav class="flex items-center gap-4">
                        <a href="{{ route('dashboard') }}" class="rounded-sm border border-transparent px-4 py-2 text-sm hover:border-[#19140035] dark:hover:border-[#3E3E3A]">Dashboard</a>
                        <a href="{{ route('visa-ai') }}" class="rounded-sm border border-[#19140035] px-4 py-2 text-sm hover:border-[#1915014a] dark:border-[#3E3E3A] dark:hover:border-[#62605b]">Visa AI</a>
                    </nav>
                </div>
            </div>
        </header>

        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 class="text-2xl font-semibold mb-6">Visa AI</h1>

            <div class="grid auto-rows-min gap-4 md:grid-cols-3 mb-6">
                <a href="#" class="flex flex-col items-center justify-center rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6 hover:border-[#1915014a] dark:hover:border-[#62605b] transition-colors">
                    <div class="text-4xl mb-3">📄</div>
                    <span class="font-medium">Document Analysis</span>
                    <span class="text-sm text-[#706f6c] dark:text-[#A1A09A] mt-1">Upload and analyze visa documents</span>
                </a>
                <a href="#" class="flex flex-col items-center justify-center rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6 hover:border-[#1915014a] dark:hover:border-[#62605b] transition-colors">
                    <div class="text-4xl mb-3">✅</div>
                    <span class="font-medium">Eligibility Check</span>
                    <span class="text-sm text-[#706f6c] dark:text-[#A1A09A] mt-1">Check visa eligibility criteria</span>
                </a>
                <a href="#" class="flex flex-col items-center justify-center rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6 hover:border-[#1915014a] dark:hover:border-[#62605b] transition-colors">
                    <div class="text-4xl mb-3">💬</div>
                    <span class="font-medium">AI Assistant</span>
                    <span class="text-sm text-[#706f6c] dark:text-[#A1A09A] mt-1">Chat with Visa AI assistant</span>
                </a>
            </div>

            <div class="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6">
                <h2 class="text-lg font-medium mb-2">Getting Started</h2>
                <p class="text-[#706f6c] dark:text-[#A1A09A]">Select an option above to begin using Visa AI. Documents are processed securely with AI assistance.</p>
            </div>
        </main>
    </body>
</html>
