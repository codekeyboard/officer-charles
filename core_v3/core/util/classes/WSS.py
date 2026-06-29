import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '../'))

import asyncio
import websockets
import threading
import json
from typing import Callable, Optional, Dict, Any

from core.util.functions.ssl_context import ssl_context
from core.util.functions.debug import debug, d, dd


class WSS:
    def __init__(
            self,
            host: str = None,
            port: int = None,
            tunnel=None,
            tunnel_identifier=None,
        ):

        # placeholders
        self.host = host
        self.port = port
        self.tunnel = tunnel
        self.tunnel_identifier = tunnel_identifier if tunnel_identifier else (host, port)
        self.clients: Dict[int, Any] = {}
        self.client_counter = 0
        
        # Callable functions
        self.fn_new_client: Optional[Callable] = None
        self.fn_client_left: Optional[Callable] = None
        self.fn_message_received: Optional[Callable] = None
        
        # Event loop
        self.loop = None
        self._server = None
        dd(f"[WSS] Initialized with host={self.host}, port={self.port}, tunnel={self.tunnel}, tunnel_identifier={self.tunnel_identifier}")
    
    def set_fn_new_client(self, fn):
        self.fn_new_client = fn
    
    def set_fn_client_left(self, fn):
        self.fn_client_left = fn
        
    def set_fn_message_received(self, fn):
        self.fn_message_received = fn
    
    async def _handle_client(self, websocket, path = None):
        # Create client object similar to original WebsocketServer
        client = {
            'id': self.client_counter,
            'handler': websocket,
            'address': websocket.remote_address
        }
        
        # Store client
        self.clients[self.client_counter] = client
        self.client_counter += 1
        
        # Call new client callback
        if self.fn_new_client:
            self.fn_new_client(client, self)
            
        try:
            async for message in websocket:
                # Handle both binary and text messages
                if isinstance(message, bytes):
                    if self.fn_message_received:
                        self.fn_message_received(client, self, message)
                else:
                    try:
                        # Try to parse as JSON
                        parsed_message = json.loads(message)
                        if self.fn_message_received:
                            self.fn_message_received(client, self, parsed_message)
                    except json.JSONDecodeError:
                        # Handle as plain text
                        if self.fn_message_received:
                            self.fn_message_received(client, self, message)
                            
        # except websockets.exceptions.ConnectionClosed:
        #     pass
        except websockets.exceptions.ConnectionClosed as e:
            debug(f"[WSS] Connection closed: {e.code}, {e.reason}")

        except websockets.exceptions.ConnectionClosedError as e:
            debug(f"[WSS] ConnectionClosedError: {e}")
        except websockets.exceptions.WebSocketException as e:
            debug(f"[WSS] WebSocketException: {e}")

        finally:
            # Remove client and call disconnect callback
            if client['id'] in self.clients:
                del self.clients[client['id']]
                if self.fn_client_left:
                    self.fn_client_left(client, self)
    
    def send_message(self, client, message):
        """Send a message to a specific client"""

        if self.tunnel:
            debug(f"[WSS] Sending message to client {client['id']} via tunnel: {message}")
            return self.tunnel.send_message(self, client, message)

        if not client or client['id'] not in self.clients:
            return
            
        # Convert message to string if it's not already
        if isinstance(message, (dict, list)):
            message = json.dumps(message)
        elif isinstance(message, bytes):
            pass  # Keep binary data as is
        else:
            message = str(message)
            
        # Create task in event loop
        asyncio.run_coroutine_threadsafe(
            client['handler'].send(message),
            self.loop
        )
    
    def send_message_to_all(self, message):
        """Send a message to all connected clients"""

        if self.tunnel:
            return self.tunnel.send_message_to_all(self, message)

        for client in self.clients.values():
            self.send_message(client, message)
    
    async def _run_server(self):
        ssl_ctx = ssl_context()
        if ssl_ctx: debug("[WSS]: Using SSL Context: " + str(ssl_ctx))
        else: dd("[SSL]: No SSL")

        try:
            self._server = await websockets.serve(
                self._handle_client,
                self.host,
                self.port,
                ssl=ssl_ctx
            )
        except Exception as e:
            debug(f"[WSS] WebSocketException in serve: {e}")

        try:
            await self._server.wait_closed()
        except Exception as e:
            debug(f"[WSS] Runtime exception: {e}")
    
    def run_forever(self, threaded=False):
        """Start the server"""

        # Case-A: WSTS
        if self.tunnel:
            return self.tunnel.register(self, self.tunnel_identifier)

        # Case-B: Normal WSS
        if threaded:
            def run_in_thread():
                self.loop = asyncio.new_event_loop()
                asyncio.set_event_loop(self.loop)
                self.loop.run_until_complete(self._run_server())
                self.loop.run_forever()
            
            thread = threading.Thread(target=run_in_thread)
            thread.daemon = True
            thread.start()
        else:
            # In Python 3.12+, get_event_loop() may raise if no current loop.
            # Create and set a new loop when none is present to support direct, non-threaded runs.
            try:
                self.loop = asyncio.get_running_loop()
            except RuntimeError:
                self.loop = asyncio.new_event_loop()
                asyncio.set_event_loop(self.loop)
            self.loop.run_until_complete(self._run_server())
            self.loop.run_forever()
    
    def close(self):
        """Close the server and all connections"""

        if self.tunnel:
            return self.tunnel.close(self)

        if self._server:
            self._server.close()
            if self.loop:
                asyncio.run_coroutine_threadsafe(
                    self._server.wait_closed(),
                    self.loop
                )

    # -------
    # Utility
    # -------

    def get_client_id(self, target):
        for id, client in self.clients.items():
            if client == target:
                return id