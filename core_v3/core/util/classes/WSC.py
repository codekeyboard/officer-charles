from websocket import WebSocketApp
from websocket import WebSocketConnectionClosedException
import threading

class WSC(WebSocketApp):
  wsc_thread = None

  def run_forever(self, threaded = False, *args, **kwargs):
    if not threaded:
      return super().run_forever(*args, **kwargs)
    
    self.wsc_thread = threading.Thread(target=super().run_forever, args=args, kwargs=kwargs)
    self.wsc_thread.start()

  def is_connected(self):
    sock = getattr(self, "sock", None)
    return bool(sock and getattr(sock, "connected", False))