import queue
import threading
import time
from typing import Callable, Any

class BackgroundEngine:
    """A simple background job processor for asynchronous tasks (emails, long-running reports)."""
    
    _queue = queue.Queue()
    _worker_thread: threading.Thread = None
    _stop_event = threading.Event()

    @classmethod
    def start_worker(cls):
        """Starts the worker thread."""
        if cls._worker_thread and cls._worker_thread.is_alive():
            return
        
        cls._stop_event.clear()
        cls._worker_thread = threading.Thread(target=cls._process_queue, daemon=True)
        cls._worker_thread.start()
        print("Background Engine worker started.")

    @classmethod
    def stop_worker(cls):
        """Signals the worker to stop."""
        cls._stop_event.set()
        if cls._worker_thread:
            cls._worker_thread.join()

    @classmethod
    def enqueue(cls, func: Callable, *args, **kwargs):
        """Add a job to the background queue."""
        cls._queue.put((func, args, kwargs))

    @classmethod
    def _process_queue(cls):
        """Worker loop processing jobs one by one."""
        while not cls._stop_event.is_set():
            try:
                # Use a timeout to avoid blocking forever, allowing check for stop_event
                func, args, kwargs = cls._queue.get(timeout=1.0)
                try:
                    func(*args, **kwargs)
                except Exception as e:
                    print(f"Error executing background job {func.__name__}: {e}")
                finally:
                    cls._queue.task_done()
            except queue.Empty:
                continue

# Usage Example:
# BackgroundEngine.enqueue(send_email, to="user@example.com", body="Hello")
