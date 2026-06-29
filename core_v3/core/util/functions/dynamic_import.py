import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

import importlib

def dynamic_import(name, variable=None, fallback=None):
    try:
        module = importlib.import_module(name)
        if variable is None: return module
        return getattr(module, variable)
    except ModuleNotFoundError:
        if fallback is not None: return fallback
        raise ImportError(f"Module '{name}' not found.")
    except AttributeError:
        if fallback is not None: return fallback
        raise ImportError(f"Class '{variable}' not found in module '{name}'.")
    except Exception as e:
        if fallback is not None: return fallback
        raise e
