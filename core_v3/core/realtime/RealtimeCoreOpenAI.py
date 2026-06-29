import os, sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

# 
# System Imports
# 

import datetime
import json
import queue
import threading
from threading import Thread
from time import time, sleep
from traceback import format_exc

# 
# Project Imports
# 

from core.interfaces.PluginInterface import PluginInterface

from core.util.classes.RTRequestPack import RTRequestPack
from core.util.classes.WSS import WSS
from core.util.classes.WSC import WSC, WebSocketConnectionClosedException

from core.util.functions.env import env
from core.util.functions.config import config
from core.util.functions.debug import debug, d, dd
from core.util.functions.dynamic_import import dynamic_import

from core.util.decorators.log_exceptions import log_exceptions

# 
# Globals
# 

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_ROOT = os.path.join(CURRENT_DIR, '..', '..', 'dist')

# AVAIALBLE_WSS_MODES
FIRST_CLIENT_ONLY = 0
ALL_AS_ONE = 1
CORE_CLASS_VERSION = 10

# 
# Realteim Core V10 Class
# 

class RealtimeCoreOpenAI():
  """
  RealtimeCoreOpenAI

  A pluggable real-time assistant core designed for OpenAI's Realtime API integration. This class handles bi-directional
  WebSocket communication with the frontend and OpenAI, enabling both audio and text-based interaction with support for 
  custom function calls, plugin extensions, and dynamic instruction contexts.

  Core Features:
  - Frontend WebSocket server (`wss`) for handling browser clients.
  - OpenAI Realtime API WebSocket client (`wsc`) for live assistant responses.
  - Plugin system for extending assistant functionality (e.g., Translator, KnowledgeBase, Location).
  - Built-in support for dynamic instructions, tool registration, and audio streaming.
  - Configurable command handlers for frontend input (e.g., 'commit', 'text', 'response.cancel').

  Constructor Args:
  ----------------

  `api_key` : str, optional
    + API key for accessing OpenAI's Realtime API. Default is read from environment variable `OPENAI_KEY`.

  `setup` : bool, optional
    + If True, automatically calls the `setup()` method on initialization. Default is False.

  `BRAIN_FILE` : str, optional
    + Path to the .hbrain file used for securing and managing instruction/tools/config content.

  `BRAIN_KEY` : str, optional
    + Encryption key for reading brain file. Default is read from config/env.

  `default_assistant_name` : str, optional
    + Name used for placeholder replacements in instruction templates. Default is 'Assistant'.

  `wss_host` : str, optional
    + IP address or hostname to bind the frontend WebSocket server. Default is '127.0.0.1'.

  `wss_port` : int, optional
    + Port for frontend WebSocket server. Default is 6123.

  `disable_wss` : bool, optional
    + If True, disables frontend WebSocket server setup. Useful for non-interactive batch tasks.

  `kwargs` : dict
    + Any additional parameters required by child assistant classes.

  Common Methods:
  ---------------
  - `setup()`: Initializes WSS, WSC, tools, config, and session.
  - `rt_request_reply()`: Triggers a text/audio response from the assistant.
  - `rt_request_function()`: Sends tool-call request and dispatches the function.
  - `fe_audio_handler()`: Receives and buffers frontend audio stream.
  - `fe_command_handler()`: Handles incoming frontend commands like 'commit', 'text', or 'response.cancel'.
  - `wss_message()`: Frontend WebSocket event router for JSON messages.
  - `wsc_message()`: OpenAI Realtime WebSocket message handler.
  - `wss_send()`: Sends message to frontend.
  - `use_plugin()`: Registers one or more plugins.

  Plugin System:
  --------------
  Plugins are used to extend assistant capabilities (e.g., translator, UI interface, ISA device info).
  - All plugins must inherit from `PluginInterface`.
  - Plugins must implement `validate(self)` and optionally `on_init()`.

  Use `.use()` or `.use_plugin()` to load plugins.

  Notes:
  ------
  - `WSS_MODE` determines client handling strategy:
      - `FIRST_CLIENT_ONLY` (0): Allows only one connected client.
      - `ALL_AS_ONE` (1): Broadcasts to all clients.
  - Use `self.re_call_function = True` inside function calls to re-trigger tool after completion.
  - Plugins and their aliases can be configured in `config/realtime.py`.
  - Use `self.tools_map[name] = handler` to register OpenAI function-call dispatchers.

  Version:
  --------
  v10.12
  """
  DEBUG = 2
  """
  DEBUG (int).
  Possible Values:
    ~> 0 : Errors only
    ~> 1 : Debug Messages
    ~> 2 : Debug Messages & Logs
  """
  # 
  # Constants
  # 
  WSS_MODE = ALL_AS_ONE
  CORE_CLASS_VERSION = CORE_CLASS_VERSION

  # 
  # Constructor
  # 
  
  def __init__(
    self,
    api_key                       = env("OPENAI_KEY", None),
    setup                         = False,
    default_assistant_name        = 'Assistant',
    wss_host                      = '127.0.0.1',
    wss_port                      = 4401,
    disable_wss                   = False,
    use_default_plugins           = True,
    disable_default_plugins       = [],
    tunnel                        = None,
    tunnel_identifier             = None,
    **kwargs
  ):
    # Arguments
    self.api_key = api_key
    self.default_assistant_name = default_assistant_name
    self.wss_host = wss_host
    self.wss_port = wss_port
    self.wss_disabled = disable_wss
    self.CLASS_NAME = type(self).__name__
    self.kwargs = kwargs
    self.tunnel = tunnel
    self.tunnel_identifier = tunnel_identifier
    dd(f"[{self.CLASS_NAME}] Extra KWARGS {json.dumps(self.kwargs)}")

    # Variables
    self.empherial_secret = None # Generated by 
    self.wsc_waiting_for = None
    self.wss_waiting_for = None
    self.waiting_for_command = None
    self.last_command = None


    self.function_name = None 
    self.function_arguments = {} 
    self.function_output = None 
    self.function_call_enabled = True
    self.re_call_function = False

    self.post_reply = False
    self.next_post_reply = False

    self.pre_reply = True
    self.next_pre_reply = None

    self.current_guidelines = None
    self.permanent_guidelines = None

    self.function_called = False
    self.user_input = False

    self.voice = self.kwargs.get('voice', None)
    self.behavior = self.kwargs.get('behavior', None)

    # Instances
    self.rp = RTRequestPack()
    self.wss = None # Initialized in setup()
    self.wsc = None # Initialized in setup()

    # Instructions & tool
    self.instructions_variables = {}
    self.instructions = ''
    self.tools = None
    self.config = {}

    self.audio_buffers_count = 0 # to avoid empty "commit" events
    self.wss_clients = []
    self.text_call = True
    self.modalities = None

    # Plugin Management
    self.plugins = {}
    self.default_plugins = [
      p for p in config('realtime.plugins.default', [])
      if p not in disable_default_plugins
    ] if use_default_plugins else []

    # Tool Functions Mapping
    self.tools_map = {
      # 'process_admin': self.handle_admin_process,
    }

    self.MESSAGE_LISTENERS = {
      'system': [
        self.debug_system_message,
      ],
      'user': [
        self.debug_user_message,
      ],
      'assistant': [
        self.debug_assistant_message,
      ]
    }

    # Listener for all WSC JSON responses
    self.OPENAI_LISTENERS = []

    # OpenAI Response Event Handlers
    self.WSC_EVENT_HANDLERS = {
      "response.audio.delta":                                     self.rt_audio_delta_handler,
      "response.audio_transcript.done":                           self.rt_assistant_reply_handler,
      "response.text.delta":                                      self.rt_text_delta_handler,
      "response.text.done":                                       self.rt_response_text_done,
      "conversation.item.input_audio_transcription.completed":    self.rt_transcription_handler,
      'response.audio_transcript.delta':                          self.rt_response_transcription_delta,
      'session.updated':                                          self.rt_wsc_session,
      'session.created':                                          self.rt_wsc_session,
      'response.done':                                            self.wsc_response_done,
      'rate_limits.updated':                                      self.wsc_limits_updated,
      # "response.function_call_arguments.done": self.wsc_item_creation_handler,
    }
    self.wsc_event_logs = {
      'binary': None,

      'session.created': None,
      'session.updated': None,
      'conversation.created': None,
      'conversation.item.created': None,
      'conversation.item.input_audio_transcription.completed': None,
      'conversation.item.input_audio_transcription.failed': None,
      'conversation.item.truncated': None,
      'conversation.item.deleted': None,
      'input_audio_buffer.committed': None,
      'input_audio_buffer.cleared': None,
      'input_audio_buffer.speech_started': None,
      'input_audio_buffer.speech_stopped': None,
      'response.created': None,
      'response.done': None,
      'response.output_item.added': None,
      'response.output_item.done': None,
      'response.content_part.added': None,
      'response.content_part.done': None,
      'response.text.delta': None,
      'response.text.done': None,
      'response.audio_transcript.delta': None,
      'response.audio_transcript.done': None,
      'response.function_call_arguments.delta': None,
      'response.audio.done': None,
      'response.function_call_arguments.done': None,
      'rate_limits.updated': None,

      'invalid': None,
    }
    self.wsc_last_event = None

    # Frontend Event Handlers
    self.WSS_EVENT_HANDLERS = {
      "binary":  self.fe_audio_handler,
      "command": self.fe_command_handler,
    }
    self.CUSTOM_COMMAND_HANDLERS = {
      # Add in child class
    }
    self.wss_event_logs = {
      'binary': None,
      'command': None,
      'invalid': None,
    }
    self.wss_last_event = None
    self.command_logs = {}
    self.text_streams = {}  # key -> str

    # Inbound WSC ordering (per-core workers)
    # Text pipeline: response.text.*, response.audio_transcript.*
    self._wsc_text_queue = queue.Queue()
    self._wsc_text_worker = None
    self._wsc_text_worker_lock = threading.Lock()

    # Audio pipeline: binary frames + response.audio.delta
    self._wsc_audio_queue = queue.Queue()
    self._wsc_audio_worker = None
    self._wsc_audio_worker_lock = threading.Lock()


    # Results Placeholders
    self.session = {}
    self.reset_time = None
    # self.openai_events = {}

    if setup:
      self.setup()

    self.session_expiry_minutes = 60
    self.rp.on_call(self._update_rp)
    Thread(target=self._session_ping_loop, daemon=True).start()

    if self.DEBUG: dd(f"[{self.CLASS_NAME}]: Constructed Instance.")

  def __del__(self):
    # possibly debug's here won't work
    if self.DEBUG: d(f"[{self.CLASS_NAME}]: Destroying Instance.")

    # Close WSS
    if self.wss and not self.wss_disabled:
      try:
        self.wss.close()
      except Exception as e:
        debug(f"[{self.CLASS_NAME}] Error while closing WSS: {str(e)}")

    # Close WSC
    if self.wsc:
      try:
        self.wsc.close()
      except Exception as e:
        debug(f"[{self.CLASS_NAME}] Error while closing WSC: {str(e)}")

  # 
  # Setup
  # 

  def setup(self):
    # Use Default Plugins
    for plugin in self.default_plugins:
      if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] Using default plugin {plugin}")
      self.use(plugin, is_default=True)

    # Load Instructions, Tools & Config
    self.load_instructions_variables()
    self.load_instructions()
    self.load_tools()
    self.load_model_config()
    if self.behavior:
      self.update_behavior(self.behavior)
      debug(f"[{self.CLASS_NAME}] Updated behavior: {self.behavior}")

    # Create Session
    if not self.create_session(): return False

    # Setup WSC & WSS
    self.setup_wsc()
    if not self.wss_disabled: self.setup_wss()

    # Debug & Return
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}]: Setup completed.")
    return True
  

  # 
  # Frontend (FE) Handlers
  # 

  def fe_audio_handler(self, audio):
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] FE: AUDIO")
    self.wsc_send(self.rp.audio_buffer(audio))
    self.audio_buffers_count += 1

  def fe_command_handler(self, payload):
    command = payload.get('command')
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] FE: COMMAND = {str(command)}")

    self.last_command = command
    self.command_logs[command] = payload.get('payload', {})
    if self.waiting_for_command == command:
      self.waiting_for_command = None

    if command == 'commit':
      if self.audio_buffers_count:
        self.wsc_clearlog('input_audio_buffer.committed')
        self.wsc_send(self.rp.audio_commit())
        self.wsc_wait('input_audio_buffer.committed')
      else:
        debug(f"[{self.CLASS_NAME}] WARNING: No Audio in buffer to commit.")
    
    elif command == 'text':
      input_text = payload.get('payload')
      if not input_text:
        self.wss_send({"type": "error", "message": "Empty Text"})
        return

      self.wsc_clearlog('conversation.item.created')
      self.wsc_send(self.rp.create_conversation_item(content_text=input_text))
      self.wsc_wait('conversation.item.created')
      self.mutual_user_callback(input_text)
      self.mutual_request_next_reply()

      return
    
    elif command == 'response.cancel':
      debug(f"[{self.CLASS_NAME}] Cancelling Response")
      self.wsc_send(self.rp.cancel_response())
      self.wsc_wait('response.cancelled')
      debug(f"[{self.CLASS_NAME}] Response Cancelled")
      return
    
    
    # Custom Comand Handlers (for child class)
    elif command in self.CUSTOM_COMMAND_HANDLERS.keys():
      self.CUSTOM_COMMAND_HANDLERS[command](payload.get('payload', {}))
      return
    
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: Unhandled command {command}. registered = {self.CUSTOM_COMMAND_HANDLERS.keys()}")
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] payload = {str(payload)}")


  # 
  # OpenAI RealTime (RT) Important Requests
  # 

  def rt_send_guidelines(self, guidelines):
    
    # System Message Listners
    for listener in self.MESSAGE_LISTENERS.get('system', []):
      if callable(listener):
        try:
          listener(guidelines)
        except Exception as e:
          debug(f"[{self.CLASS_NAME}] Error in system message listener: {str(e)}\n{format_exc()}")

    self.wsc_clearlog('conversation.item.created')
    self.wsc_send(self.rp.create_conversation_item(guidelines, role="system"))
    self.wsc_wait('conversation.item.created')

  # Request a Reply from Assistant
  def rt_request_reply(self, guidelines=None, reply=True):
    modalities = ['text', 'audio']
    if self.modalities:
      modalities = self.modalities
    if self.text_call:
      modalities = ['text']
      self.text_call = False

    self._ensure_response_done()

    if guidelines is not None: self.rt_send_guidelines(guidelines)
    dd(f"[{self.CLASS_NAME}] rt_request_reply: guidelines={guidelines}, reply={reply}, modalities={modalities}")
    if reply:     self.wsc_send(self.rp.create_response(tool_choice='none', modalities=modalities))
    else:         self.rt_call_next_function(toggle=False)

  # Request a Function Call
  def rt_request_function(self):
    self.wsc_clearlog('response.output_item.added')
    self.wsc_clearlog('response.function_call_arguments.done')

    # place-two
    self._ensure_response_done()
    self.wsc_send(self.rp.create_response(modalities=["text"], tool_choice="required", tools=self.tools))
    
    name = None
    max_retries = 10
    retries = 0
    while not name and retries < max_retries:
      retries += 1
      self.wsc_wait('response.output_item.added', timeout=10)
      try:
        response_event_log = self.wsc_event_logs.get('response.output_item.added', {})
        if response_event_log is None:
          dd(f"[{self.CLASS_NAME}] [WARN]: OpenAI did not reply in-time. Was waiting for function name.")
          if retries %3 == 0:
            self.wss_send({
              "type": "text.delta",
              "message": "[WARN]: Assistant is taking longer than usual to respond. Please wait...",
            })
            self.wss_send({"type": "text.completed"})
          elif retries >= max_retries:
            self.wss_send({
              "type": "text.delta",
              "message": "[ERROR]: Assistant failed to respond. Please try again.",
            })
            self.wss_send({"type": "text.completed"})
          continue

        name = response_event_log.get('item', {}).get('name')
      except Exception as e:
        dd(f"[{self.CLASS_NAME}] [ERROR]: Exception while trying to get function name: {str(e)}\n{format_exc()}")

    if name is None:
      if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: Function name not found in 'response.output_item.added' !")
      return

    self.wsc_wait('response.function_call_arguments.done')
    arguments = self.wsc_event_logs.get('response.function_call_arguments.done', {})
    if arguments is None:
      if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: Function arguments not found. aborting function call!")
      return

    arguments = json.loads(arguments.get('arguments', '{}'))
    
    self.function_called = True

    if self.DEBUG: d(f"[{self.CLASS_NAME}] > Function Call = {name}({json.dumps(arguments)})")
    if name in self.tools_map:
      self.function_name = name
      self.function_arguments = arguments
      self.function_output = None

      try:
        self.function_output = self.tools_map[name](arguments)
      except Exception as e:
        debug(f"[{self.CLASS_NAME}] {str(e)}\n{format_exc()}")

      if self.function_output:
        dd(f"[{self.CLASS_NAME}] pre_reply: {self.pre_reply}, next_pre_reply: {self.next_pre_reply}")
        should_reply_now = self.pre_reply if self.next_pre_reply is None else self.next_pre_reply
        dd(f"[{self.CLASS_NAME}] Function {name} returned output, replying now: {should_reply_now}")
        self.rt_request_reply(
          guidelines = self.function_output,
          reply      = should_reply_now,
        )

    else:
      debug(f"[{self.CLASS_NAME}] WSC: Error! Function called by OpenAI Does not exist! Tried to call {name}")


  # 
  # OpenAI RealTime (RT) Handlers
  # 

  # Audio Delta
  def rt_audio_delta_handler(self, payload):
    if not payload.get('delta'):
      if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: Invalid Audio Buffer")
      return
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: AUDIO")
    self.wss_send_raw(payload['delta'])

  # Text Delta
  def rt_text_delta_handler(self, payload):
    delta = payload.get('delta')
    if not delta: 
      if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: Empty text delta")
      return
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: text delta recieved: {delta}")
    # key = f"{payload.get('item_id')}:{payload.get('output_index',0)}:{payload.get('content_index',0)}"
    # buf = self.text_streams.get(key, "")
    # buf += delta
    # self.text_streams[key] = buf
    self.wss_send({ "type": "text.delta", "delta": delta })

  # Assistant Audio Reply
  def rt_assistant_reply_handler(self, payload):
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: AUDIO DONE = {json.dumps(payload)}")
    # self.wss_send({
    #   "type": "text.delta",
    #   "message": payload.get('transcript', ''),
    # })
    self.rt_reply(payload, 'transcript')

  # text done
  def rt_response_text_done(self, payload):
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: TEXT DONE = {json.dumps(payload)}")
    # self.wss_send({ "type": "text.delta", "delta": payload.get("text", "") })
    self.rt_reply(payload, 'text')

  def wsc_response_done(self, payload: dict) -> None:
    """
    as of now only to handle token/msg limits
    """
    dd(f"[{self.CLASS_NAME}] WSC: RESPONSE.DONE = {json.dumps(payload)}")
    response = payload.get('response', {})
    if response.get('status') != 'failed':
      return

    error = response.get('status_details', {}).get('error', {})
    error_code = error.get('code', 'unknown_error')
    error_message = str(error.get('message', 'An unknown error occurred.'))
    error_type = error.get('type', 'unknown_error')
    d(f"[{self.CLASS_NAME}] WSC: Response failed with ERROR {error_type} {error_code} - {error_message}")

    if error_type != "tokens":
      d(f"[{self.CLASS_NAME}] WSC: not handling non tpm errors")
      return

    if not self.reset_time:
      time_to_sleep: float = 40.0
    else:
      time_to_sleep: float = self.reset_time - time() + 2

    self.reset_time = None
    if time_to_sleep > 0:
      self.wss_send({"type": "text.completed"})
      self.wss_send({
        "type": "text.delta",
        "message": f"[WARN]: Assistant won't be replying for next {time_to_sleep:.2f} seconds due to rate-limiting. Please wait...",
      })
      self.wss_send({"type": "text.completed"})
      sleep(time_to_sleep)

    self.rt_request_reply("[admin] reply to most recent user message now.")

  def wsc_limits_updated(self, payload: dict) -> None:
    dd(f"[{self.CLASS_NAME}] WSC: RATE LIMITS UPDATED = {json.dumps(payload)}")
    rate_limits: dict = payload.get('rate_limits', [])

    for rate_limit in rate_limits:
      if (name := rate_limit.get('name')) != "tokens":
        dd(f"[{self.CLASS_NAME}] WSC: not handling non tpm rate limits ({name})")
        continue

      reset_seconds: float = float(rate_limit.get('reset_seconds', 0.0))
      self.reset_time = time() + max(0.0, reset_seconds)


  # Mutual Reply Handler (Util)
  def rt_reply(self, payload, reply_type='transcript'):
    # Assistant Message Listners
    for listener in self.MESSAGE_LISTENERS.get('assistant', []):
      if callable(listener):
        try:
          listener(payload.get(reply_type, '').strip())
        except Exception as e:
          debug(f"[{self.CLASS_NAME}] Error in assistant message listener: {str(e)}\n{format_exc()}")

    self.rt_call_next_function()
    self.wss_send({
      "type": "text.completed",
    })

  # Transcriptions
  def rt_transcription_handler(self, payload):
    # Callback
    self.mutual_user_callback(payload.get('transcript', ''))

    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: AUDIO TRANSCRIBED")

    self.wss_send({
      "type": "transcription",
      "message": payload.get('transcript', '').strip(),
    })

    self.mutual_request_next_reply()

  def mutual_user_callback(self, mesage):
    # Call User Message Listners
    for listener in self.MESSAGE_LISTENERS.get('user', []):
      if callable(listener):
        try:
          listener(mesage.strip())
        except Exception as e:
          debug(f"[{self.CLASS_NAME}] Error in user message listener: {str(e)}\n{format_exc()}")

  def mutual_request_next_reply(self):
    self.rt_request_reply(
      guidelines = self.current_guidelines if self.current_guidelines else self.permanent_guidelines,
      reply      = self.post_reply if self.next_post_reply is None else self.next_post_reply,
    )
    self.next_pre_reply = None
    self.next_post_reply = False
    self.current_guidelines = None
    return
  
  def rt_response_transcription_delta(self, payload):
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: AUDIO DELTA")

    self.wss_send({
      "type": "text.delta",
      "message": payload.get('delta', ''),
    })

  # Call next function (mutual helper)
  def rt_call_next_function(self, toggle=True):
    # Request Function call
    if self.re_call_function:
      self.re_call_function = False
      self.wsc_clearlog("response.done")
      self.wsc_wait("response.done")
      self.rt_request_function()
      return

    # Avoid recursive function calls
    if toggle and self.function_called:
      self.function_called = False
      return
    
    # Request Function call
    if self.function_call_enabled:
      self.rt_request_function()

  def rt_wsc_session(self, payload):
    if self.DEBUG > 1:
        dd(f"[{self.CLASS_NAME}] WSC: SESSION CREATED or UPDATED = {json.dumps(payload)}")
    self.openai_session_id = payload.get("session", {}).get('id', None)
    if self.DEBUG:
        dd(f"[{self.CLASS_NAME}] Stored session ID: {self.openai_session_id}")

  # 
  # Create Session (POST Request)
  # 

  def create_session(self):
    dd(f"[{self.CLASS_NAME}] Creating OpenAI Realtime Session...")
    voice = self.voice or self.config.get('voice', 'ash')
    dd(f"[{self.CLASS_NAME}] Using voice: {voice}")
    self.session = self.rp.create_realtime_session(
      
      # Key
      api_key = self.api_key,

      # Instructions & Tools
      instructions = self.instructions,
      tools        = self.tools,

      # Models 
      model       = self.config.get('llm', 'gpt-realtime'),
      audio_model = self.config.get('stt', 'whisper-1'),

      # Response Config
      voice                      = voice,
      temperature                = self.config.get('temperature', 0.8),
      # max_response_output_tokens = self.config.get('max_response_output_tokens', 'inf'),

      # Other Config
      threshold           = self.config.get('threshold', 0.5),
      prefix_padding_ms   = self.config.get('prefix_padding_ms', 300),
      silence_duration_ms = self.config.get('silence_duration_ms', 500),

    )

    if self.session.get('error'):
      debug(f"[{self.CLASS_NAME}] FATAL: Error while creating session {str(self.session)}")
      return False
    
    if self.DEBUG: dd(f"[{self.CLASS_NAME}] < Instructions = {self.instructions}")
    if self.DEBUG: dd(f"[{self.CLASS_NAME}] < Tools = {json.dumps(self.tools)}")

    self.empherial_secret = self.session.get('client_secret', {}).get('value')
    return bool(self.empherial_secret)


  # 
  # WebSocket Client (OpenAI)
  # 

  def setup_wsc(self):
    self.wsc_url = f"wss://api.openai.com/v1/realtime?model=" + self.config.get('llm', 'gpt-realtime')

    self.wsc = WSC(
      self.wsc_url,
      header=[
        f"Authorization: Bearer {self.empherial_secret}",
        "OpenAI-Beta: realtime=v1"
      ],
      on_open    = self.wsc_open,
      on_message = self.wsc_message,
      on_error   = self.wsc_error,
      on_close   = self.wsc_close,
    )

    if self.DEBUG: d(f'[{self.CLASS_NAME}] OpenAI Starting.')
    self.wsc.run_forever(threaded=True)
    if self.DEBUG: d(f'[{self.CLASS_NAME}] OpenAI Ready.')

  # WSC Handlers
  def wsc_open(self, ws):
    if self.wsc_waiting_for == 'ws_open': self.wsc_waiting_for = None
    voice = self.voice or self.config.get('voice', 'ash')
    dd(f"[{self.CLASS_NAME}] Using voice: {voice}")
    self.wsc_send(
      self.rp.update_session(
        
        # Instructions & Tools
        instructions = self.instructions,
        tools        = self.tools,

        # Models 
        audio_model = self.config.get('stt', 'whisper-1'),

        # Response Config
        voice                      = voice,
        temperature                = self.config.get('temperature', 0.8),
        # max_response_output_tokens = self.config.get('max_response_output_tokens', 'inf'),

        # Other Config
        threshold           = self.config.get('threshold', 0.5),
        prefix_padding_ms   = self.config.get('prefix_padding_ms', 300),
        silence_duration_ms = self.config.get('silence_duration_ms', 500),

      )
    )
    if self.DEBUG > 1: dd(f'[{self.CLASS_NAME}] WSC connected')

  def wsc_error(self, ws, error):
    self.wsc_waiting_for = None
    debug(f"[{self.CLASS_NAME}] WSC error:", error)

  def wsc_close(self, ws, close_status_code, close_msg):
    if self.wsc_waiting_for == 'wsc_close': self.wsc_waiting_for = None
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC closed." + str(close_status_code) + ", " + str(close_msg))
  
  def wsc_message(self, ws, message):
    if self.wsc_waiting_for == 'wsc_message': self.wsc_waiting_for = None

    # Binary Handler
    if isinstance(message, bytes):
      if 'binary' in self.WSC_EVENT_HANDLERS:
        # Kill Wait Loop
        if self.wsc_waiting_for == 'binary': self.wsc_waiting_for = None

        # Log Event
        self.wsc_last_event = 'binary'
        self.wsc_event_logs['binary'] = message

        # Enqueue to audio pipeline to preserve order of audio frames
        self._ensure_wsc_audio_worker()
        self._wsc_audio_queue.put({'type': 'binary', 'payload': message})
        return
        # return self.WSC_EVENT_HANDLERS['binary'](message)

      # Fallback
      if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: Unhandled Binary Data")
      return
    
    elif bool(dd(f"[{self.CLASS_NAME}] WSC: Msg: {message}")) and False:
      pass

    # Text Event Proprocessing & Validation
    elif isinstance(message, str):
      try: message = json.loads(message)
      except:
        if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: Invalid Message from FE.")
        return
    elif not isinstance(message, dict):
      if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: Received unsupported message data-type " + str(type(message)))
      return
    if 'type' not in message:
      if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: Unexpected Response without event type.")
      return

    # raw json listeners
    for listener in self.OPENAI_LISTENERS:
      if callable(listener):
        try:
          listener(message)
        except Exception as e:
          debug(f"[{self.CLASS_NAME}] Error in user message listener: {str(e)}\n{format_exc()}")

    # Print all payloads
    if self.DEBUG > 1 and message.get('type') != 'response.audio_transcript.done': dd(f"[{self.CLASS_NAME}] WSC PAYLOAD = {json.dumps(message)}")

    # Kill Wait Loop
    if self.wsc_waiting_for == message['type'] or message['type'] == 'error': self.wsc_waiting_for = None

    # Log Event
    self.wsc_last_event = message.get('type', 'invalid')
    self.wsc_event_logs[message.get('type', 'invalid')] = message

    # Event Handler routing (preserve order for text + transcription + audio deltas)
    evt_type = message['type']
    handler = self.WSC_EVENT_HANDLERS.get(evt_type)
    if handler:
      text_events = {
        'response.text.delta',
        'response.text.done',
        'response.audio_transcript.delta',
        'response.audio_transcript.done',
        'conversation.item.input_audio_transcription.completed',
      }
      audio_events = {
        'response.audio.delta',
      }

      if evt_type in text_events:
        self._ensure_wsc_text_worker()
        self._wsc_text_queue.put(message)
        return
      if evt_type in audio_events:
        self._ensure_wsc_audio_worker()
        self._wsc_audio_queue.put(message)
        return

      # Default behavior: keep concurrency via per-event thread
      Thread(target=handler, args=(message,)).start()
      return

    # Fallback
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: Unhandled Event {message['type']}")
    if message['type'] == "error":
      debug(f"[{self.CLASS_NAME}] WSC: Error Event = {str(message)}")

  # WSC Senders
  def wsc_send_raw(self, data):
    dd(f"[{self.CLASS_NAME}] WSC: SENDING RAW DATA = {data}")
    try: self.wsc.send(data)
    except WebSocketConnectionClosedException as exc:
      debug(f"[{self.CLASS_NAME}] WSC: Connection Closed! Error ={str(exc)}. Re-Connecting ...")
      self.setup_wsc()
      self.wsc_wait('wsc_open')
      self.wsc_send_raw(data)
    except:
      debug(f"[{self.CLASS_NAME}] WSC: Error while sending a message: {format_exc()}")
    
  def wsc_send(self, payload: dict):
    dd(f"[{self.CLASS_NAME}] WSC: SENDING PAYLOAD = {json.dumps(payload)}")
    dd(f"[{self.CLASS_NAME}] WSC: PAYLOAD KEYS = {list(payload.keys())}")
    if 'type' in payload:
      if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: SENDING {payload['type']}")
    self.wsc_send_raw(json.dumps(payload))

  # Util
  def wsc_clearlog(self, wait_for='binary'):
    self.wsc_event_logs[wait_for] = None

  def wsc_wait(self, waiting_for='binary', timeout=5.0, skip_on_log=True):
    if skip_on_log and self.wsc_event_logs.get(waiting_for): return

    self.wsc_waiting_for = waiting_for
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: Waiting for " + waiting_for)

    start_time = time()
    while self.wsc_waiting_for is not None:
      if time() - start_time > timeout:
        if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: Wait timed out")
        break
      sleep(0.1)
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSC: Wait Completed")

  # WSC text/audio pipelines
  def _ensure_wsc_text_worker(self):
    with self._wsc_text_worker_lock:
      if self._wsc_text_worker is None or not self._wsc_text_worker.is_alive():
        self._wsc_text_worker = Thread(target=self._wsc_text_loop, daemon=True)
        self._wsc_text_worker.start()

  def _ensure_wsc_audio_worker(self):
    with self._wsc_audio_worker_lock:
      if self._wsc_audio_worker is None or not self._wsc_audio_worker.is_alive():
        self._wsc_audio_worker = Thread(target=self._wsc_audio_loop, daemon=True)
        self._wsc_audio_worker.start()

  def _wsc_text_loop(self):
    while True:
      evt = self._wsc_text_queue.get()
      try:
        if evt is None:
          return
        self._dispatch_wsc_text(evt)
      except Exception as e:
        debug(f"[{self.CLASS_NAME}] _wsc_text_loop error: {str(e)}\n{format_exc()}")
      finally:
        try:
          self._wsc_text_queue.task_done()
        except Exception:
          pass

  def _wsc_audio_loop(self):
    while True:
      evt = self._wsc_audio_queue.get()
      try:
        if evt is None:
          return
        self._dispatch_wsc_audio(evt)
      except Exception as e:
        debug(f"[{self.CLASS_NAME}] _wsc_audio_loop error: {str(e)}\n{format_exc()}")
      finally:
        try:
          self._wsc_audio_queue.task_done()
        except Exception:
          pass

  def _dispatch_wsc_text(self, message):
    evt_type = message.get('type')
    if self.DEBUG > 1:
      dd(f"[{self.CLASS_NAME}] WSC TEXT IN: {evt_type}")
    handler = self.WSC_EVENT_HANDLERS.get(evt_type)
    if callable(handler):
      handler(message)

  def _dispatch_wsc_audio(self, evt):
    evt_type = evt.get('type')
    if evt_type == 'binary':
      handler = self.WSC_EVENT_HANDLERS.get('binary')
      if callable(handler):
        handler(evt.get('payload'))
      return
    if self.DEBUG > 1:
      dd(f"[{self.CLASS_NAME}] WSC AUDIO IN: {evt_type}")
    handler = self.WSC_EVENT_HANDLERS.get(evt_type)
    if callable(handler):
      handler(evt)


  # 
  # WebSocket Server (Frontend)
  # 

  def setup_wss(self):
    self.wss = WSS (
      self.wss_host,
      self.wss_port,
      tunnel=self.tunnel,
      tunnel_identifier=self.tunnel_identifier
    )
    self.wss.set_fn_new_client      (self.wss_connect)
    self.wss.set_fn_client_left     (self.wss_disconnect)
    self.wss.set_fn_message_received(self.wss_message)
    
    if self.DEBUG > 1: dd(f'[{self.CLASS_NAME}] WSS Starting.')
    self.wss.run_forever(threaded=True)
    if self.DEBUG > 1: dd(f'[{self.CLASS_NAME}] WSS Ready.')

  # WSS Handlers
  def wss_connect   (self, client, wss):
    self.wss_clients.append(client)
    if self.wss_waiting_for == 'wss_connect': self.wss_waiting_for = None
    if self.DEBUG: d(f'[{self.CLASS_NAME}] FE Client connected . Client {str(client.get('id', 0))} at {str(client.get('address'))}')

  def wss_disconnect(self, client, wss):
    self.wss_clients.remove(client)
    self.wss_waiting_for = None
    if self.DEBUG: dd(f'[{self.CLASS_NAME}] FE Client disconnected. Client {str(client)}')
  
  @log_exceptions
  def wss_message(self, client, wss, message):
    dd(f"[{self.CLASS_NAME}] WSS: {wss}")
    if self.WSS_MODE == FIRST_CLIENT_ONLY:
      if self.wss_clients[0] != client:
        return self.wss.send_message(client, {
          "type": "error",
          "message": "Hey a client is already connected! Disconnected that one first"
        })

    if self.wss_waiting_for == 'wss_message': self.wss_waiting_for = None

    # Binary
    if isinstance(message, bytes):
      if 'binary' in self.WSS_EVENT_HANDLERS:

        # Wait
        if self.wss_waiting_for == 'binary': self.wss_waiting_for = None

        # Log Event
        self.wss_last_event = 'binary'
        self.wss_event_logs['binary'] = message

        # Callback
        Thread(target=self.WSS_EVENT_HANDLERS['binary'], args=(message,)).start()
        return

      # Fallback
      if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSS: Unhandled Binary Data")
      return
      
    # Text Event Pre-processing
    elif isinstance(message, str):
      try:    message = json.loads(message)
      except:
        if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSS: Invalid Message from FE.")
        return
    elif not isinstance(message, dict):
      if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSS: Received unsupported message data-type " + str(type(message)))
      return
    
    if 'type' not in message:
      if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSS: Unexpected Response without event type.")
      return
      
    # Extra debugs. @debug
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSS PAYLOAD = {json.dumps(message)}")
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSS Waiting For = {self.wss_waiting_for}")

    # Kill Wait
    if self.wss_waiting_for == message.get('type') or message['type'] == 'error': self.wss_waiting_for = None
    
    # Log Event
    self.wss_last_event = message.get('type', 'invalid')
    self.wss_event_logs[message.get('type', 'invalid')] = message

    # Text Event Handler
    for event, handler in self.WSS_EVENT_HANDLERS.items():
      if message['type'] == event:
        Thread(target=handler, args=(message,)).start()
        return

    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSS: Unhandled Event {message['type']}")

  # WSS Senders
  def wss_send_raw(self, data):
    try:
      if self.WSS_MODE == FIRST_CLIENT_ONLY:
        self.wss.send_message(self.wss_clients[0], data)
      
      elif self.WSS_MODE == ALL_AS_ONE:
        self.wss.send_message_to_all(data)

    except WebSocketConnectionClosedException as exc:
      debug(f"[{self.CLASS_NAME}] WSS: Connection CLosed! Error =" + str(exc) + ". Re-Connecting ...")
      self.setup_wss()
      self.wss_wait('wss_open')
      self.wss_send_raw(data)
    except:
      debug(f"[{self.CLASS_NAME}] WSS: Error while sending a message. {format_exc()}")
    
  def wss_send(self, payload):
    self.wss_send_raw(json.dumps(payload))

  # Util

  def wss_clearlog(self, wait_for='binary'):
    self.wss_event_logs[wait_for] = None

  def wss_wait(self, waiting_for='binary', timeout=5.0, skip_on_log=True):
    if skip_on_log and self.wss_event_logs[waiting_for]: return

    self.wss_waiting_for = waiting_for
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSS: Waiting for " + waiting_for)

    start_time = time()
    while self.wss_waiting_for is not None:
      if time() - start_time > timeout:
        if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSS: Wait timed out for {self.wss_waiting_for}")
        break
      sleep(0.1)
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WSS: Wait Completed")

  def command_wait(self, command_name, timeout=5.0):
    self.waiting_for_command = command_name
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] COMMAND: Waiting for {command_name}")

    start_time = time()
    while self.waiting_for_command is not None:
      if time() - start_time > timeout:
        if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] COMMAND: Wait timed out")
        break
      sleep(0.1)
    
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] COMMAND: Wait completed for {command_name}")

  # 
  # Util
  # 

  # Get Resource
  def resource(self, resource_name, extension=".json", convert_to_json=True, json_exception=False):
    """
    Load resource from DIST_ROOT/brains/CLASS_NAME/{resource_name}{extension}.
    
    - extension: file extension (default .json)
    - convert_to_json: if True, tries to parse JSON
    - json_exception: if True, raises on JSON error; else returns raw text
    """
    path = os.path.join(DIST_ROOT, "brains", self.CLASS_NAME, f"{resource_name}{extension}")
    if not os.path.exists(path):
      raise FileNotFoundError(f"[{self.CLASS_NAME}] Resource '{resource_name}' not found at {path}")

    try:
      with open(path, "r", encoding="utf-8") as f:
        content = f.read()
        if convert_to_json:
          try:
            return json.loads(content)
          except Exception as je:
            if json_exception:
              raise je
        return content
    except Exception as e:
      raise ValueError(f"[{self.CLASS_NAME}] Error loading resource '{resource_name}': {e}")


  def load_instructions_variables(self):
    self.instructions_variables = {
      'assistant-name' : self.get_assistant_name(),
      "date"           : self.get_current_date(),
      "time"           : self.get_current_time(),
    }

  def update_behavior(self, behavior):
    curr_instructions = self.instructions
    try:
      start_idx = curr_instructions.index("<behavior>") + len("<behavior>")
      end_idx = curr_instructions.index("</behavior>")
    except ValueError:
      if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}] WARNING: <behavior> tags not found in instructions. using default behavior and not the one from kwargs")
      return
    
    new_instructions = curr_instructions[:start_idx] + "\n" + behavior.strip() + "\n" + curr_instructions[end_idx:]
    self.instructions = new_instructions
  
  def load_instructions(self):
    # return @debug
    instructions = self.resource("context")
    if self.DEBUG > 1: dd(f"[{self.CLASS_NAME}]: Setting Instructions Variables = {self.instructions_variables}")

    for k,v in self.instructions_variables.items():
      if v: instructions = instructions.replace(f"<{k}>", v)

    self.instructions = json.dumps(instructions)

  def load_tools(self):
    tools = self.resource("tools")
    self.tools = tools if isinstance(tools, list) else json.loads(tools)
    dd(f"[{self.CLASS_NAME}] Tools loaded: {len(self.tools)} tools\ntools = {json.dumps(self.tools, indent=2)}")

  def load_model_config(self):
    config = self.resource("config")
    self.config = config if isinstance(config, dict) else json.loads(config)

  def get_assistant_name(self):
    return config('assistant.name', self.default_assistant_name)
  
  def get_current_date(self):
    return datetime.datetime.now().strftime("%d %B, %Y")
  
  def get_current_time(self):
    return datetime.datetime.now().strftime("%A")
  
  # 
  # Plugin Management
  # 
  
  def use_plugin(self, plugin_input, is_default=False):
    """
    Load, validate and initialize plugins.  
    Accepts:
      - string alias → resolves via config  
      - PluginInterface subclass  
      - PluginInterface instance  
      - list/tuple of any of the above  

    Ensures each plugin:
      1. Implements PluginInterface  
      2. Passes its `validate(self)` check  
      3. Is instantiated (if class) or used directly (if instance)  
      4. Has `on_init()` invoked  
    """
    # Avoid re-initialization
    if not is_default and (plugin_input in self.default_plugins):
      debug(f"[{self.CLASS_NAME}] Plugin {plugin_input} is already initialized")
      return

    # handle list
    if isinstance(plugin_input, (list, tuple)):
      for p in plugin_input:
        self.use_plugin(p)
      return

    # if already an instance, bind it
    if isinstance(plugin_input, PluginInterface):
      plugin = plugin_input
      name = type(plugin).__name__
    else:
      # resolve alias→class or accept class
      if isinstance(plugin_input, str):
        path = config(f"realtime.plugins.{plugin_input}")
        if not path:
          debug(f"[{self.CLASS_NAME}] Plugin alias '{plugin_input}' not found")
          return
        plugin_cls = dynamic_import(path, path.split('.')[-1])
      else:
        plugin_cls = plugin_input

      if not issubclass(plugin_cls, PluginInterface):
        debug(f"[{self.CLASS_NAME}] Plugin {plugin_cls} does not implement PluginInterface")
        return

      ok, err = plugin_cls.validate(self)
      if not ok:
        debug(f"[{self.CLASS_NAME}] Plugin {plugin_cls.__name__} validation failed: {err}")
        return

      plugin = plugin_cls(self)
      name = plugin_cls.__name__

    # register and initialize
    self.plugins[name] = plugin
    if hasattr(plugin, "on_init"):
      plugin.on_init()

    dd(f"[{self.CLASS_NAME}] Plugin loaded: {name}")


  def has_plugin(self, plugin_cls_or_name):
    name = plugin_cls_or_name if isinstance(plugin_cls_or_name, str) else plugin_cls_or_name.__name__
    return name in self.plugins

  def get_plugin(self, plugin_cls_or_name):
    name = plugin_cls_or_name if isinstance(plugin_cls_or_name, str) else plugin_cls_or_name.__name__
    return self.plugins.get(name)
  
  # 
  # Aliases
  # 

  def use(self, plugin_input, is_default=False):
    """
    Shorthand for `use_plugin`. Accepts:
      - a string alias
      - a PluginInterface subclass
      - a PluginInterface instance
      - a list/tuple of any of the above
    """
    return self.use_plugin(plugin_input, is_default=is_default)

  # 
  # Debug Listeners
  # 

  def debug_system_message(self, message):
    """
    Prints a system message to the debug log.
    """
    if self.DEBUG: d(f"[{self.CLASS_NAME}] < System = {message}")

  def debug_user_message(self, message):
    """
    Prints a user message to the debug log.
    """
    if self.DEBUG: d(f"[{self.CLASS_NAME}] < User = {message}")

  def debug_assistant_message(self, message):
    """
    Prints an assistant message to the debug log.
    """
    if self.DEBUG: d(f"[{self.CLASS_NAME}] < Assistant = {message}")


  #
  # Util
  #

  def _ensure_response_done(self, timeout=5.0, mode="cancel"):
    """
    Ensures the previous response cycle has completed.
    - Uses either 'wait' or 'cancel' mode as per self.response_wait_mode.
    - mode can be "wait" or "cancel". can be overriten by self.response_wait_mode
    """

    mode = getattr(self, "response_wait_mode", mode)  # default: wait

    # check if any active response exists
    if not self.wsc_event_logs.get("response.created"):
      return  # nothing active, skip

    if mode == "wait":
      self.wsc_wait("response.done", timeout=timeout)

    elif mode == "cancel":
      # if previous response not finished
      if not self.wsc_event_logs.get("response.done"):
        dd(f"[{self.CLASS_NAME}] Active response detected — cancelling...")
        self.wsc_send(self.rp.cancel_response())
        self.wsc_wait("response.cancelled", timeout=timeout)
        dd(f"[{self.CLASS_NAME}] Response cancelled")

    # reset for next response
    self.wsc_clearlog("response.done")
    self.wsc_clearlog("response.created")

  def _update_rp(self, ts): self.last_rp_call = ts
  def _session_ping_loop(self):
    while True:
      sleep(600)  # check every 10m
      if time() - getattr(self, "last_rp_call", 0) > (self.session_expiry_minutes - 10) * 60:
        self.wsc_send(self.rp.clear_audio_buffer())
        debug(f"[{self.CLASS_NAME}] Sent keep-alive ping (audio buffer clear)")


"""
Version v10.12
"""
