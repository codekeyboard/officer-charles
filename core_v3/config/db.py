from core.util.functions.env import env

db_config = {
    'host'    : env('DB_HOST', '127.0.0.1'),
    'port'    : env('DB_PORT', 3306),
    'user'    : env('DB_USER', 'root'),
    'password': env('DB_PASSWORD', 'root'),
    'database': env('DB_NAME', 'bpro'),
}