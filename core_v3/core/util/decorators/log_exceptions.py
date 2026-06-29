import os, sys
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.append(ROOT_DIR) if ROOT_DIR not in sys.path else None

from core.util.functions.debug import debug

from traceback import format_exc

# Decorator
def log_exceptions(func):
    """
    Decorator to handle exceptions in methods.
    Logs the error and returns None.
    """
    def wrapper(self, *args, **kwargs):
        try:
            debug(f"[log_exceptions decorator][{self.__class__.__name__}] Calling {func.__name__} with args: {args}, kwargs: {kwargs}")
            return func(self, *args, **kwargs)
        except Exception as e:
            class_name = getattr(self, 'CLASS_NAME', self.__class__.__name__)
            debug(f"[{class_name}] Error in {func.__name__}: {str(e)}\n{format_exc()}")
            return None
    return wrapper