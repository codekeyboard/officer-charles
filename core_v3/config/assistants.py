from core.util.functions.env import env

assistants_config = {
    "hotel_receptionist": {
        "api": {
            "username": env("HOTEL_API_USERNAME", "admin"),
            "password": env("HOTEL_API_PASSWORD", "admin_not_secure"),
        }
    }
}
