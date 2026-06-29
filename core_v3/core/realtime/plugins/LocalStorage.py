import os, sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from core.interfaces.PluginInterface import PluginInterface
from core.util.functions.debug import debug

class LocalStorage(PluginInterface):
  """
  LocalStorage plugin for RealtimeCoreOpenAI.

  - Sets up core.local_storage as {} during init.
  - Exposes: reset_local_storage(), sync_local_storage(dict), local_get(key), local_set(key, value)
  """
  DEBUG = 1

  @staticmethod
  def validate(core):
    # No config validation needed
    return True, None

  def on_init(self):
    """
    Called once plugin is attached.

    - Initialize core.local_storage
    - Expose reset_local_storage, sync_local_storage, local_get, local_set to core
    """
    self.core.local_storage = {}
    self.core.set_default_local_storage = self._set_default_local_storage

    self.extend_core("reset_local_storage",   self._reset_local_storage)
    self.extend_core("sync_local_storage",    self._sync_local_storage)
    self.extend_core("local_get",             self._local_get)
    self.extend_core("local_set",             self._local_set)

    self.core.set_default_local_storage({})  # can be overwritten later

    if self.DEBUG >= 2:
      debug(f"[LocalStorage] Plugin initialized with empty local storage.")

  def _set_default_local_storage(self, default: dict):
    """
    Set core._default_local_storage and reset immediately.

    :param default: default dict to set
    """
    self.core._default_local_storage = default
    self.core.reset_local_storage()

  def _reset_local_storage(self):
    """
    Resets core.local_storage to default values.
    """
    self.core.local_storage = dict(self.core._default_local_storage)
    if self.DEBUG >= 2:
      debug(f"[LocalStorage] local_storage reset to default")

  def _sync_local_storage(self, new_data: dict):
    """
    Updates core.local_storage using given dict (only existing keys).

    :param new_data: dict to sync
    """
    for key, value in new_data.items():
      if key in self.core.local_storage:
        self.core.local_storage[key] = value
    if self.core.DEBUG >= 2:
      debug(f"[LocalStorage] Synced: {new_data}")

  def _local_get(self, key: str):
    """
    Get value from core.local_storage[key].

    :param key: key to access
    """
    return self.core.local_storage.get(key)

  def _local_set(self, key: str, value):
    """
    Set value in core.local_storage[key].

    :param key: key to assign
    :param value: value to set
    """
    self.core.local_storage[key] = value
    if self.core.DEBUG >= 2:
      debug(f"[LocalStorage] local_storage[{key}] = {value}")
