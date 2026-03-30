from typing import Callable, Dict, List, Any

class HookManager:
    """Manages global and per-DocType event hooks."""
    
    _hooks: Dict[str, Dict[str, List[Callable]]] = {}

    @classmethod
    def register(cls, doctype: str, event: str, callback: Callable):
        """
        Register a callback for a specific DocType and event.
        Events: before_insert, after_insert, before_save, after_save, on_submit, on_cancel
        """
        if doctype not in cls._hooks:
            cls._hooks[doctype] = {}
        
        if event not in cls._hooks[doctype]:
            cls._hooks[doctype][event] = []
            
        cls._hooks[doctype][event].append(callback)

    @classmethod
    def trigger(cls, doctype: str, event: str, doc: Any, *args, **kwargs):
        """Execute all registered callbacks for an event."""
        if doctype in cls._hooks and event in cls._hooks[doctype]:
            for callback in cls._hooks[doctype][event]:
                try:
                    callback(doc, *args, **kwargs)
                except Exception as e:
                    print(f"Hook Error: {doctype}.{event} -> {e}")

# Example:
# HookManager.register("Sales Invoice", "on_submit", send_notification_email)
