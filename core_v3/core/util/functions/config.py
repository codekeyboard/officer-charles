import os, sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from config.app import app_config

def config(key, default=None):
    """Retrieve configuration value using dot notation for nested keys."""
    keys = key.split(".")  # Split key by dots to access nested keys
    value = app_config

    try:
        for k in keys:
            value = value[k]  # Traverse nested dictionaries
        return value if value is not None else default
    except KeyError:
        return default