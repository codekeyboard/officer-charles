import os, sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from core.interfaces.PluginInterface import PluginInterface
from core.util.functions.debug import debug

class Payload(PluginInterface):
  """
  Payload plugin for RealtimeCoreOpenAI.

  - Sets up core.payload as {} during init.
  - Exposes: reset_payload(), sync_payload(dict), payload_get(key), payload_set(key, value)
  """
  DEBUG = 1

  @staticmethod
  def validate(core):
    # No config validation needed for payload plugin
    return True, None

  def on_init(self):
    """
    Called once plugin is attached.

    - Initialize core.payload with default payload
    - Expose reset_payload, sync_payload, payload_get, payload_set to core
    """
    self.core.payload = {}
    self.core.set_default_payload = self._set_default_payload
    self.core.PAYLOAD_ON_RESET_LISTENERS = []
    self.core.PAYLOAD_ON_UPDATE_LISTENERS = []

    self.extend_core("reset_payload",  self._reset_payload)
    self.extend_core("sync_payload",   self._sync_payload)
    self.extend_core("payload_get",    self._payload_get)
    self.extend_core("payload_set",    self._payload_set)

    self.core.set_default_payload({})  # can be overwritten later

    if self.DEBUG:
      debug(f"[Payload] Plugin initialized with empty payload.")

  def _set_default_payload(self, default_payload: dict):
    """
    Sets default payload and resets immediately.

    :param default_payload: A dict representing default payload values
    """
    self.core._default_payload = default_payload
    self.core.reset_payload()

  def _reset_payload(self):
    """
    Resets core.payload to default values.
    """
    self.core.payload = dict(self.core._default_payload)
    if self.DEBUG >= 2:
      debug(f"[Payload] Payload reset to default")

    # Call Listeners
    for callable in getattr(self.core, 'PAYLOAD_ON_RESET_LISTENERS', []):
      callable()

  def _sync_payload(self, new_data: dict):
    """
    Updates core.payload with fields from given dict.
    Only updates keys already present in payload.
    
    :param new_data: dict to sync
    """
    for key, value in new_data.items():
      if key in self.core.payload:
        self.core.payload[key] = value

    for callable in getattr(self.core, 'PAYLOAD_ON_UPDATE_LISTENERS', []):
      callable(self.core.payload)

    if self.core.DEBUG >= 2:
      debug(f"[Payload] Payload synced: {new_data}")

  def _payload_get(self, key: str):
    """
    Returns value from core.payload[key] or None.

    :param key: key to access
    """
    return self.core.payload.get(key)

  def _payload_set(self, key: str, value):
    """
    Updates value in core.payload[key].

    :param key: key to set
    :param value: value to assign
    """
    self.core.payload[key] = value
    if self.core.DEBUG >= 2:
      debug(f"[Payload] payload[{key}] = {value}")

    for callable in getattr(self.core, 'PAYLOAD_ON_UPDATE_LISTENERS', []):
      callable({key: value})
