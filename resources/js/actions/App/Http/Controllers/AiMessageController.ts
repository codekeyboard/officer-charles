import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\AiMessageController::index
* @see app/Http/Controllers/AiMessageController.php:115
* @route '/api/ai/messages'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/api/ai/messages',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\AiMessageController::index
* @see app/Http/Controllers/AiMessageController.php:115
* @route '/api/ai/messages'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\AiMessageController::index
* @see app/Http/Controllers/AiMessageController.php:115
* @route '/api/ai/messages'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\AiMessageController::index
* @see app/Http/Controllers/AiMessageController.php:115
* @route '/api/ai/messages'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\AiMessageController::index
* @see app/Http/Controllers/AiMessageController.php:115
* @route '/api/ai/messages'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\AiMessageController::index
* @see app/Http/Controllers/AiMessageController.php:115
* @route '/api/ai/messages'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\AiMessageController::index
* @see app/Http/Controllers/AiMessageController.php:115
* @route '/api/ai/messages'
*/
indexForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url({
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

index.form = indexForm

/**
* @see \App\Http\Controllers\AiMessageController::store
* @see app/Http/Controllers/AiMessageController.php:29
* @route '/api/ai/messages'
*/
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/api/ai/messages',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\AiMessageController::store
* @see app/Http/Controllers/AiMessageController.php:29
* @route '/api/ai/messages'
*/
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\AiMessageController::store
* @see app/Http/Controllers/AiMessageController.php:29
* @route '/api/ai/messages'
*/
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\AiMessageController::store
* @see app/Http/Controllers/AiMessageController.php:29
* @route '/api/ai/messages'
*/
const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\AiMessageController::store
* @see app/Http/Controllers/AiMessageController.php:29
* @route '/api/ai/messages'
*/
storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

store.form = storeForm

/**
* @see \App\Http\Controllers\AiMessageController::restart
* @see app/Http/Controllers/AiMessageController.php:151
* @route '/api/ai/restart'
*/
export const restart = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: restart.url(options),
    method: 'post',
})

restart.definition = {
    methods: ["post"],
    url: '/api/ai/restart',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\AiMessageController::restart
* @see app/Http/Controllers/AiMessageController.php:151
* @route '/api/ai/restart'
*/
restart.url = (options?: RouteQueryOptions) => {
    return restart.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\AiMessageController::restart
* @see app/Http/Controllers/AiMessageController.php:151
* @route '/api/ai/restart'
*/
restart.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: restart.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\AiMessageController::restart
* @see app/Http/Controllers/AiMessageController.php:151
* @route '/api/ai/restart'
*/
const restartForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: restart.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\AiMessageController::restart
* @see app/Http/Controllers/AiMessageController.php:151
* @route '/api/ai/restart'
*/
restartForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: restart.url(options),
    method: 'post',
})

restart.form = restartForm

/**
* @see \App\Http\Controllers\AiMessageController::liveSession
* @see app/Http/Controllers/AiMessageController.php:185
* @route '/api/ai/live-session'
*/
export const liveSession = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: liveSession.url(options),
    method: 'post',
})

liveSession.definition = {
    methods: ["post"],
    url: '/api/ai/live-session',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\AiMessageController::liveSession
* @see app/Http/Controllers/AiMessageController.php:185
* @route '/api/ai/live-session'
*/
liveSession.url = (options?: RouteQueryOptions) => {
    return liveSession.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\AiMessageController::liveSession
* @see app/Http/Controllers/AiMessageController.php:185
* @route '/api/ai/live-session'
*/
liveSession.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: liveSession.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\AiMessageController::liveSession
* @see app/Http/Controllers/AiMessageController.php:185
* @route '/api/ai/live-session'
*/
const liveSessionForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: liveSession.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\AiMessageController::liveSession
* @see app/Http/Controllers/AiMessageController.php:185
* @route '/api/ai/live-session'
*/
liveSessionForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: liveSession.url(options),
    method: 'post',
})

liveSession.form = liveSessionForm

const AiMessageController = { index, store, restart, liveSession }

export default AiMessageController