import os, sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from core.interfaces.PluginInterface import PluginInterface
from core.util.functions.debug import debug

class Service(PluginInterface):
  """
  Service plugin for RealtimeCoreOpenAI.

  - Exposes service-related helpers:
    - set_services(map)
    - sync_service(arguments)
    - call_service(arguments)
    - unlock_service(arguments={}, service_type='unknown', call=False, sub_category='')
    - sub_category(arguments, category: str, msg=None, on_cancel=None, re_call_on_cancel=True)
    - is_sub_category(target: str | list)
    - Alias: unlock_service_type()
  """
  DEBUG = 2

  @staticmethod
  def validate(core):
    return True, None

  def on_init(self):
    """
    Initialize service maps, bind helpers to core.
    """
    self.core.service_type = 'unknown'
    self.core.sub_category_name = ''
    self.core.service_type_locked = False
    self.core._service_cancel_message = "[admin]: Tell customer that their request has been cancelled. Ask them if they need anything else."
    self.core._service_resets_enabled = True
    self.core._service_change_listeners = []

    self.extend_core("set_services", self._set_services)
    self.extend_core("sync_service", self._sync_service)
    self.extend_core("call_service", self._call_service)
    self.extend_core("unlock_service", self._unlock_service)
    self.extend_core("unlock_service_type", self._unlock_service)  # alias
    self.extend_core("sub_category", self._sub_category)
    self.extend_core("set_sub_category", self._set_sub_category)
    self.extend_core("is_service", self._is_service)
    self.extend_core("is_sub_category", self._is_sub_category)
    self.extend_core("set_service_cancel_message", self._set_service_cancel_message)
    self.extend_core("on_service_change", self._on_service_change)
    self.extend_core("set_service_resets", self._set_service_resets)
    self.extend_core("set_service_change_listener", self._set_service_change_listener)

    if self.DEBUG >= 2:
      debug("[Service] Initialized")

  def _set_services(self, service_map: dict):
    """
    Assign services_map.
    """
     
    self.core.services_map = service_map
    if self.core.DEBUG >= 2:
      debug(f"[Service] Services Set: {list(service_map.keys())}")

  def _sync_service(self, arguments: dict):
    """
    Sync service type from arguments.
    """
     
    if self.core.service_type_locked:
      return

    new_type = arguments.get("service_type", "unknown").strip()
    if new_type != self.core.service_type:
      if self.core.DEBUG >= 2:
        debug(f"[Service] Service changed from {self.core.service_type} → {new_type}")
      self.core.on_service_change(self.core.service_type, new_type)
      self.core.service_type = new_type

  def _call_service(self, arguments: dict):
    """
    Call the current service handler.
    """
     
    if self.core.service_type in self.core.services_map:
      return self.core.services_map[self.core.service_type](arguments)
    if self.core.DEBUG:
      debug(f"[Service] Unhandled service_type: {self.core.service_type}")

  def _unlock_service(self, arguments={}, service_type='unknown', call=False, sub_category=''):
    """
    Unlock current service type and optionally call a new service.
    """
     
    self.core.service_type_locked = False
    self.core.on_service_change(self.core.service_type, service_type)
    self.core.service_type = service_type
    self.core.sub_category_name = sub_category
    self.core.reset_payload()
    self.core.reset_local_storage()
    if call:
      return self.core.call_service(arguments)

  def _sub_category(self, arguments: dict, category: str, msg=None, on_cancel=None, re_call_on_cancel=True):
    """
    Handles sub-category setup and cancel logic.
    """
     
    self.core.service_type_locked = True

    if arguments.get("cancel_current_request", False):
      if on_cancel:
        return on_cancel(self.core)
      self.core.unlock_service(arguments)
      if re_call_on_cancel:
        self.core.re_call_function = True
      return msg or self.core._service_cancel_message

    if not self.core.sub_category_name:
      self.core.sub_category_name = category

  def _set_service_cancel_message(self, message: str):
    """
    Set custom service cancel message.
    """
     
    self.core._service_cancel_message = message

  def _is_sub_category(self, target):
    """
    Check current sub_category match.
    Accepts string or list of strings.
    """
     
    if isinstance(target, list):
      return self.core.sub_category_name in target
    return self.core.sub_category_name == target

  def _is_service(self, target):
    """
    Check current sub_category match.
    Accepts string or list of strings.
    """
     
    if isinstance(target, list):
      return self.core.service_type in target
    return self.core.service_type == target

  def _on_service_change(self, from_service, to_service):
    """
    Default on_service_change logic.
    Resets sub_category always, and conditionally resets payload & storage.
    Also triggers custom listeners if added.
    """
     
    if self.core.DEBUG >= 2:
      debug(f"[Service] on_service_change: {from_service} → {to_service}")

    self.core.sub_category_name = ''

    if self.core._service_resets_enabled:
      if hasattr(self.core, "reset_payload"): self.core.reset_payload()
      if hasattr(self.core, "reset_local_storage"): self.core.reset_local_storage()

    for listener in self.core._service_change_listeners:
      try: listener(from_service, to_service)
      except Exception as e:
        debug(f"[Service] Listener error: {e}")

  def _set_service_resets(self, enabled: bool):
    """
    Enable or disable automatic resets during service changes.
    """
     
    self.core._service_resets_enabled = enabled
    if self.core.DEBUG >= 2:
      debug(f"[Service] Resets on change = {enabled}")

  def _set_service_change_listener(self, callback):
    """
    Add a listener function to run on service change.
    Listener must accept (from_service, to_service) args.
    """
     
    self.core._service_change_listeners.append(callback)
    if self.core.DEBUG >= 2:
      debug(f"[Service] Added service change listener")

  def _set_sub_category(self, sub_category: str):
    """
    Set current sub_category manually.
    """
     
    self.core.sub_category_name = sub_category
    if self.core.DEBUG >= 2:
      debug(f"[Service] sub_category manually set to: {sub_category}")
