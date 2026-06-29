import os, sys
from datetime import datetime
from core.util.functions.config import config

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

# Get current timestamp parts
now = datetime.now()
day_dir = now.strftime("%Y-%m-%d")  # Daily folder
hour_dir = now.strftime("%Y-%m-%d--%H-00-logs")  # Hourly folder

log_file_time = now.strftime("%H-%M-%S")
log_file = log_file_time + "-debug.log"  # Filename
detailed_log_file = log_file_time + "-detailed.log" # Detailed file

# Create full path: logs/<day_dir>/<hour_dir>/<log_file>
LOG_DIR = os.path.join(ROOT_DIR, "logs", day_dir, hour_dir)
DEBUG_FILE = os.path.join(LOG_DIR, log_file)
DETAILED_FILE = os.path.join(LOG_DIR, detailed_log_file)

# Ensure directory exists
os.makedirs(LOG_DIR, exist_ok=True)

def debug(*args, is_detailed=False, **kwargs):
    """Custom debug function to log messages if debug mode is enabled."""
    (dd if is_detailed else d)(*args, **kwargs)

def d(message, *args, **kwargs):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    prefix = f"[{timestamp}] "

    """Custom debug function to log messages if debug mode is enabled."""
    if config("debug", False):
        dd(message, *args, **kwargs)
        with open(DEBUG_FILE, "a", encoding='utf-8') as f:
            print(prefix + str(message), *args, *([kwargs] if len(kwargs) else []), file=f)

def dd(message, *args, **kwargs):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    prefix = f"[{timestamp}] "

    """Custom detailed debug function to log detailed messages if debug mode is enabled."""
    if config("debug", False):
        with open(DETAILED_FILE, "a", encoding='utf-8') as f:
            print(prefix + str(message), *args, *([kwargs] if len(kwargs) else []), file=f)
