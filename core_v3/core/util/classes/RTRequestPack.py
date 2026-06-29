import os, sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

import json
import base64
import requests
import time
from core.util.functions.debug import debug, d, dd

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

class RTRequestPack():
  
  DEBUG = True

  def __init__(self):
    self._in_on_call = False
    self._on_call_handler = None
    self._last_call_time = 0

  def on_call(self, handler):
    self._on_call_handler = handler

  # 
  # Session: Emphermal Secret Key
  # 

  # Create Session
  def create_realtime_session(self, api_key=None, instructions="You are a friendly assistant.", modalities=["audio", "text"], model="gpt-4o-realtime-preview-2024-12-17", audio_model='whisper-1', voice=None, input_audio_format=None, output_audio_format=None, input_audio_transcription=None, tools=None, tool_choice=None, temperature=0.8, max_response_output_tokens="inf", threshold=0.5, prefix_padding_ms=300, silence_duration_ms=200, create_response=None):
    """
    Creates a realtime session with a specified configuration for multimodal interaction.

    This function initializes a session with the OpenAI API to enable realtime interactions 
    using text, audio, or both. It allows for extensive customization of models, tools, 
    audio processing, and response generation parameters.

    Parameters:
    - api_key (str, optional): API key for authenticating with the OpenAI API.
    - instructions (str, optional): The system message to guide the assistant's behavior. 
      Default is "You are a friendly assistant."
    - modalities (list, optional): Modalities enabled for the session, such as ["audio", "text"]. 
      Default is ["audio", "text"].
    - model (str, optional): Name of the realtime GPT model to use. Default is "gpt-4o-realtime-preview-2024-12-17".
    - audio_model (str, optional): Name of the transcription model for processing input audio. Default is 'whisper-1'.
    - voice (str, optional): The voice used for audio responses, e.g., "sage" or "ballad".
    - input_audio_format (str, optional): Format of the input audio, e.g., "pcm16".
    - output_audio_format (str, optional): Format of the output audio, e.g., "pcm16".
    - input_audio_transcription (dict, optional): Configuration settings for transcribing input audio.
    - tools (list, optional): List of additional tools (functions) available to the assistant.
    - tool_choice (str, optional): Strategy for tool selection, e.g., "auto".
    - temperature (float, optional): Sampling temperature for generating responses. Controls randomness. 
      Default is 0.8.
    - max_response_output_tokens (int or str, optional): Maximum number of tokens allowed in a single response. 
      Use "inf" for unlimited.
    - threshold (float, optional): Voice activity detection threshold for audio inputs.
    - prefix_padding_ms (int, optional): Amount of time (in ms) of audio to include before a detected voice activity.
    - silence_duration_ms (int, optional): Duration of silence (in ms) before considering a turn complete.
    - create_response (callable, optional): A callback function to process responses, if needed.

    Returns:
    - dict: A JSON response from the API, containing the session details or any error information.

    Example Usage:
    >>> session = create_realtime_session(api_key="your_api_key", modalities=["text"], model="gpt-4o-realtime")
    >>> print(session)
    """
    headers = {
      "Authorization": f"Bearer {api_key}",
      "Content-Type": "application/json"
    }
    
    # Build request body
    data = {
      "model": model,
      "modalities": modalities,
      "instructions": instructions,
    }

    # Add optional parameters
    if audio_model is not None:                data["input_audio_transcription"] = {'model': audio_model} # {'model': audio_model}
    if voice is not None:                      data["voice"] = voice
    if input_audio_format is not None:         data["input_audio_format"] = input_audio_format
    if output_audio_format is not None:        data["output_audio_format"] = output_audio_format
    if tools is not None:                      data["tools"] = tools
    if tool_choice is not None:                data["tool_choice"] = tool_choice
    if temperature is not None:                data["temperature"] = temperature
    if max_response_output_tokens is not None: data["max_response_output_tokens"] = max_response_output_tokens

    if threshold or prefix_padding_ms or silence_duration_ms:
      data["turn_detection"] = {
        'type': 'server_vad',
      }
      if threshold is not None:                  data["turn_detection"]['threshold'          ] = threshold
      if prefix_padding_ms is not None:          data["turn_detection"]['prefix_padding_ms'  ] = prefix_padding_ms
      if silence_duration_ms is not None:        data["turn_detection"]['silence_duration_ms'] = silence_duration_ms

    # Send POST request
    url = "https://api.openai.com/v1/realtime/sessions"
    response = requests.post(url, headers=headers, json=data)

    # Return the API response as JSON
    return response.json()

  
  # 
  # Session
  # 

  # Update
  def update_session(self, modalities=None, instructions=None, voice=None, input_audio_format=None, output_audio_format=None, audio_model=None, tools=None, tool_choice=None, temperature=None, max_response_output_tokens=None, threshold=None, prefix_padding_ms=None, silence_duration_ms=None,
  event_id=None):
    """
    Update the session's default configuration.

    Description:
    This function sends a `session.update` event to update the session's default configuration. 
    It updates only the fields provided and does not modify fields that are not passed. 
    The server responds with a `session.updated` event showing the effective configuration.

    Structure:
    - `event_id` (string): Optional ID for identifying the event.
    - `type` (string): Event type, always "session.update".
    - `session` (object): Contains session configuration parameters.

    Example:
    ```
    update_session(
        modalities=["text", "audio"],
        instructions="You are a helpful assistant.",
        voice="sage",
        input_audio_format="pcm16",
        output_audio_format="pcm16",
        input_audio_transcription={"model": "whisper-1"},
        turn_detection={
            "type": "server_vad",
            "threshold": 0.5,
            "prefix_padding_ms": 300,
            "silence_duration_ms": 500,
            "create_response": True
        },
        tools=[
            {
                "type": "function",
                "name": "get_weather",
                "description": "Get the current weather...",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": { "type": "string" }
                    },
                    "required": ["location"]
                }
            }
        ],
        tool_choice="auto",
        temperature=0.8,
        max_response_output_tokens="inf"
    )
    ```

    Returns:
    A dictionary containing the session update event.
    """
    event = {
      "type": "session.update",
      "session": {}
    }
    
    if event_id:                   event["event_id"] = event_id
    if audio_model is not None:    event['session']["input_audio_transcription"] = {'model': audio_model}
    if modalities:                 event["session"]["modalities"] = modalities
    if instructions:               event["session"]["instructions"] = instructions
    if voice:                      event["session"]["voice"] = voice
    if input_audio_format:         event["session"]["input_audio_format"] = input_audio_format
    if output_audio_format:        event["session"]["output_audio_format"] = output_audio_format
    # if turn_detection:             event["session"]["turn_detection"] = turn_detection
    if tools:                      event["session"]["tools"] = tools
    if tool_choice:                event["session"]["tool_choice"] = tool_choice
    if temperature:                event["session"]["temperature"] = temperature
    if max_response_output_tokens: event["session"]["max_response_output_tokens"] = max_response_output_tokens


    if threshold or prefix_padding_ms or silence_duration_ms:
      event['session']["turn_detection"] = {
        'type': 'server_vad',
      }
      if threshold is not None:                  event['session']["turn_detection"]['threshold'          ] = threshold
      if prefix_padding_ms is not None:          event['session']["turn_detection"]['prefix_padding_ms'  ] = prefix_padding_ms
      if silence_duration_ms is not None:        event['session']["turn_detection"]['silence_duration_ms'] = silence_duration_ms

    if self.DEBUG: dd("[RTRequestPack]: Generated " + json.dumps(event))

    return event


  # 
  # Audio
  # 

  # Append
  def audio_buffer(self, audio, event_id=None, encode_base64=True):
    """
    Appends audio bytes to the input audio buffer.
    
    Parameters:
    - audio (bytes): The audio data to be appended (in byte format).
    - event_id (str, optional): Optional client-generated ID used to identify this event.
    - encode_base64 (bool, optional): Set True if passed audio is not base64 encoded already
    
    Returns:
    dict: The event to send for appending the audio buffer.
    
    Example:
    event = audio_buffer(b'audio_data_bytes', event_id="event_456")
    """
    event = {
      "type": "input_audio_buffer.append",
      "audio": base64.b64encode(audio).decode('utf-8') if encode_base64 else audio,
    }
    if event_id:
      event['event_id'] = event_id

    if self.DEBUG: dd("[RTRequestPack]: Generated " + json.dumps(event))
    return event

  # Clear
  def clear_audio_buffer(self, event_id=None):
    """
    Clears the audio bytes in the input audio buffer.

    Description:
    Send this event to clear the audio bytes in the buffer. 
    The server will respond with an input_audio_buffer.cleared event.

    Structure:
    {
      "event_id": "string (optional)",
      "type": "input_audio_buffer.clear"
    }

    Example:
    clear_audio_buffer(event_id="event_012")

    Args:
      event_id (str, optional): Optional client-generated ID to identify this event.

    Returns:
      dict: Event payload for clearing the audio buffer.
    """
    event = {
      "type": "input_audio_buffer.clear"
    }
    if event_id:
      event['event_id'] = event_id

    if self.DEBUG: dd("[RTRequestPack]: Generated " + json.dumps(event))
    return event

  # Commit
  def audio_commit(self, event_id=None):
    """
    Commit the user input audio buffer.

    Description:
      This event commits the user input audio buffer, creating a new user message item in the conversation. 
      It triggers input audio transcription (if enabled) but does not generate a response from the model. 
      The server responds with an input_audio_buffer.committed event.

    Event Structure:
      {
        "event_id": "event_789",
        "type": "input_audio_buffer.commit"
      }

    Args:
      event_id (str, optional): Optional client-generated ID used to identify this event.

    Returns:
      dict: Event payload.
    """
    event = {
      "type": "input_audio_buffer.commit"
    }
    if event_id:
      event["event_id"] = event_id

    if self.DEBUG: dd("[RTRequestPack]: Generated " + json.dumps(event))
    return event


  # 
  # Conversation Item
  # 

  # Create
  def create_conversation_item(self, content_text=None, role="user", content_audio=None, item_type="message", previous_item_id=None, event_id=None, item_id=None, content_type=None, call_id=None, function_name=None, arguments=None, output=None):
    """
    Create a new item in the conversation context.

    Description:
      Adds a new item (e.g., message, function call) to the conversation context. This function allows 
      adding new items at specific positions in the conversation or appending them to the end. It supports
      various types of content, including text, audio, and function calls.

    Parameters:
      content_text (str): Text content of the message.
      role (str): Role of the sender (user, assistant, system). Default is "user".
      content_audio (str): Base64-encoded audio content for user messages.
      item_type (str): The type of the item (e.g., message, function_call, function_call_output). Default is "message".
      previous_item_id (str): ID of the preceding item for insertion. Default is None (appends to the end).
      event_id (str): Optional client-generated event ID.
      item_id (str): Unique ID of the item. If None, the server will generate one.
      content_type (str): Type of content (e.g., input_text, text). Automatically determined if None.
      call_id (str): ID of the function call (for function_call and function_call_output types).
      function_name (str): Name of the function being called (for function_call items).
      arguments (str): Arguments for the function call (for function_call items).
      output (str): Output of the function call (for function_call_output items).

    Returns:
      dict: Event payload for conversation.item.create.
    
    Example:
      event = create_conversation_item(
        content_text="Hello, how are you?",
        role="user",
        item_type="message",
        event_id="event_345",
        previous_item_id=None
      )
    """
    if content_type is None:
      if role in ["user", "system"]:
        content_type = "input_text"
      elif role == "assistant":
        content_type = "text"

    event = {
      "type": "conversation.item.create",
      "previous_item_id": previous_item_id,
      "item": {
        "id": item_id,
        "type": item_type,
        "role": role,
        "content": [
          {
            "type": content_type
          }
        ]
      }
    }

    if event_id:         event["event_id"] = event_id
    if previous_item_id: event["previous_item_id"] = previous_item_id
    if item_id:          event["item"]["id"] = item_id
    if content_text:     event["item"]["content"][0]["text"] = content_text
    if content_audio:    event["item"]["content"][0]["audio"] = content_audio
    if call_id:          event["item"]["call_id"] = call_id
    if function_name:    event["item"]["name"] = function_name
    if arguments:        event["item"]["arguments"] = arguments
    if output:           event["item"]["output"] = output

    if self.DEBUG: dd("[RTRequestPack]: Generated " + json.dumps(event))
    return event

  # Truncate
  def truncate_conversation_item(self, item_id, audio_end_ms, content_index=0, event_id=None):
    """
    Truncate a previous assistant message’s audio to synchronize the server's understanding of audio with the client's playback.

    Description:
    Sends an event to truncate audio for an assistant message. It also deletes the server-side text transcript to prevent unplayed audio text from being included in the context.

    Structure:
    - type: Must be 'conversation.item.truncate'.
    - event_id: Optional, client-generated ID to identify the event.
    - item_id: The ID of the assistant message item to truncate.
    - content_index: Index of the content part to truncate, typically set to 0.
    - audio_end_ms: Duration (in milliseconds) up to which audio should be truncated.

    Example:
    event = truncate_conversation_item(
        item_id="msg_002",
        audio_end_ms=1500,
        content_index=0,
        event_id="event_678"
    )

    Parameters:
    - item_id (str): The ID of the assistant message item to truncate.
    - audio_end_ms (int): Inclusive duration up to which audio is truncated, in milliseconds.
    - content_index (int, optional): Index of the content part to truncate. Defaults to 0.
    - event_id (str, optional): Optional client-generated ID to identify this event.

    Returns:
    - dict: The event payload to be sent to the server.
    """
    event = {
        "type": "conversation.item.truncate",
        "item_id": item_id,
        "content_index": content_index,
        "audio_end_ms": audio_end_ms,
    }
    if event_id:
        event["event_id"] = event_id

    if self.DEBUG: dd("[RTRequestPack]: Generated " + json.dumps(event))
    return event

  # Delete
  def delete_conversation_item(self, item_id, event_id=None):
    """
    Delete a conversation item.

    Sends an event to remove a specific item from the conversation history. 
    The server responds with a conversation.item.deleted event or an error 
    if the item does not exist.

    Parameters:
        item_id (str): The ID of the item to delete. (Required)
        event_id (str, optional): A client-generated ID to identify the event.

    Returns:
        dict: The event payload for deleting a conversation item.

    Example:
        delete_event = delete_conversation_item(item_id="msg_003", event_id="event_901")
        # Produces:
        # {
        #     "type": "conversation.item.delete",
        #     "item_id": "msg_003",
        #     "event_id": "event_901"
        # }
    """
    event = {
        "type": "conversation.item.delete",
        "item_id": item_id
    }
    if event_id:
        event["event_id"] = event_id

    if self.DEBUG: dd("[RTRequestPack]: Generated " + json.dumps(event))
    return event


  # 
  # Response
  # 

  # Create
  def create_response(self, modalities=["text", "audio"], instructions=None, voice=None, output_audio_format="pcm16", tools=None, tool_choice="auto", temperature=None, max_output_tokens=None, conversation=None, metadata=None, input_items=None, event_id=None):
    """
    Creates a response event to trigger model inference.

    Parameters:
    - modalities (list): Modalities for the response (e.g., ["text", "audio"]).
    - instructions (str): System instructions to guide the model's behavior.
    - voice (str): Voice for audio responses (e.g., "sage").
    - output_audio_format (str): Audio format for output (e.g., "pcm16").
    - tools (list): Available tools (functions) for the model to use.
    - tool_choice (str): How the model selects tools (e.g., "auto", "none").
    - temperature (float): Sampling temperature for the model (0.6 to 1.2).
    - max_output_tokens (int or "inf"): Maximum tokens for the response.
    - conversation (str): Determines how the response integrates into conversations ("auto" or "none").
    - metadata (dict): Key-value metadata to attach to the response.
    - input_items (list): Input items for context in the response.
    - event_id (str): Optional client-generated ID for the event.

    Returns:
    dict: The formatted response event.

    Example:
    create_response(
        modalities=["text", "audio"],
        instructions="Please assist the user.",
        voice="sage",
        output_audio_format="pcm16",
        tools=[{
            "type": "function",
            "name": "calculate_sum",
            "description": "Calculates the sum of two numbers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "a": { "type": "number" },
                    "b": { "type": "number" }
                },
                "required": ["a", "b"]
            }
        }],
        tool_choice="auto",
        temperature=0.8,
        max_output_tokens=1024
    )
    """
    event = {
        "type": "response.create",
        "response": {
            "modalities": modalities,
        }
    }
    if event_id:            event['response']["event_id"] = event_id
    if instructions:        event['response']["instructions"] = instructions
    if voice:               event['response']["voice"] = voice
    if output_audio_format: event['response']["output_audio_format"] = output_audio_format
    if tools:               event['response']["tools"] = tools
    if tool_choice:         event['response']["tool_choice"] = tool_choice
    if temperature:         event['response']["temperature"] = temperature
    if max_output_tokens:   event['response']["max_output_tokens"] = max_output_tokens
    if metadata:            event['response']["metadata"] = metadata
    if input_items:         event['response']["input"] = input_items

    if self.DEBUG: dd("[RTRequestPack]: Generated " + json.dumps(event))
    return event

  # Cancel
  def cancel_response(self, response_id=None, event_id=None):
    """
    Cancel an in-progress response.

    Description:
    Sends an event to cancel an ongoing response. If no response ID is provided, it cancels the in-progress response in the default conversation. 
    The server responds with a `response.cancelled` event or returns an error if no response exists to cancel.

    Event Structure:
    {
        "event_id": "event_567",
        "type": "response.cancel",
        "response_id": "response_id_123"
    }

    Example:
    cancel_response(response_id="response_id_123", event_id="event_567")

    Args:
    response_id (str, optional): A specific response ID to cancel. Defaults to None.
    event_id (str, optional): Optional client-generated ID for identifying the event. Defaults to None.

    Returns:
    dict: The constructed event dictionary.
    """
    event = {
        "type": "response.cancel"
    }
    if event_id:
        event["event_id"] = event_id
    if response_id:
        event["response_id"] = response_id
    
    if self.DEBUG: dd("[RTRequestPack]: Generated " + json.dumps(event))
    return event

  # Update last call time on method call
  def __getattribute__(self, name):
    attr = object.__getattribute__(self, name)
    if callable(attr) and not name.startswith("_") and name != "on_call":
      def wrapper(*args, **kwargs):
        # prevent recursion
        if not object.__getattribute__(self, "_in_on_call"):
          self._in_on_call = True
          ts = time.time()
          self._last_call_time = ts
          handler = object.__getattribute__(self, "_on_call_handler")
          if handler:
            try: handler(ts)
            except Exception: pass
          self._in_on_call = False
        return attr(*args, **kwargs)
      return wrapper
    return attr