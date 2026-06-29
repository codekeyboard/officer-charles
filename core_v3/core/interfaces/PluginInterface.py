# core/interfaces/PluginInterface.py

from abc import ABC, abstractmethod

class PluginInterface(ABC):
  """
  Base for RealtimeCoreOpenAI plugins.
  """
  def __init__(self, core):
    """
    Store reference to core instance.
    """
    self.core = core

  @abstractmethod
  def on_init(self):
    """
    Hook called once plugin is attached and validated.
    """
    pass

  @staticmethod
  def validate(core):
    """
    Optional pre-init check.
    Return (True, None) if OK,
    or (False, 'error message') on failure.
    """
    return True, None

  def extend_core(self, name, method, force=False):
    """
    Adds method to core. If force=False, raises if method exists.
    """
    if not force and hasattr(self.core, name):
        raise AttributeError(f"Cannot extend: '{name}' already exists in core.")
    setattr(self.core, name, method.__get__(self.core))

  def override_core(self, name, method):
    """
    Overrides existing method in core. Raises if method doesn't exist.
    """
    if not hasattr(self.core, name):
        raise AttributeError(f"Cannot override: '{name}' does not exist in core.")
    setattr(self.core, name, method.__get__(self.core))
