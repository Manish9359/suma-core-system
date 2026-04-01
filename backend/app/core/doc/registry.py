from typing import Dict, Type, Any, List, Optional
from .base import BaseDocument
from .meta import DocTypeMetadata

class DocRegistry:
    """Registry to keep track of available DocTypes and their associated classes/metadata."""
    
    _registry: Dict[str, Type[BaseDocument]] = {}
    _metadata: Dict[str, DocTypeMetadata] = {}

    @classmethod
    def register(cls, doctype: str, doc_class: Type[BaseDocument], metadata: DocTypeMetadata = None):
        """Register a new DocType with its class and (optional) metadata."""
        cls._registry[doctype] = doc_class
        if metadata:
            cls._metadata[doctype] = metadata

    @classmethod
    def get_class(cls, doctype: str) -> Optional[Type[BaseDocument]]:
        """Resolve a DocType name to its implementation class."""
        return cls._registry.get(doctype)

    @classmethod
    def load_meta(cls, doctype: str) -> Optional[DocTypeMetadata]:

        """Attempt to load formal JSON metadata for a DocType from the filesystem."""
        import os
        import json
        from .meta import DocTypeMetadata
        
        # Calculate base path for meta/ directory
        # registry.py is in backend/app/core/doc/
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # go up 3 levels to reach backend/ (the root of backend)
        root_backend = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
        meta_path = os.path.join(root_backend, "app", "meta", f"{doctype.lower().replace(' ', '_')}.json")

        
        if not os.path.exists(meta_path):
             return None
             
        try:
            with open(meta_path, "r") as f:
                data = json.load(f)
                return DocTypeMetadata(**data)
        except Exception as e:
             print(f"❌ Error loading metadata for {doctype}: {e}")
             return None

    @classmethod
    def get_metadata(cls, doctype: str) -> Optional[DocTypeMetadata]:
        """Resolve a DocType name to its metadata definition, with auto-loading fallback."""
        if doctype in cls._metadata:
            return cls._metadata[doctype]
            
        # Fallback: Try to load from meta/ directory dynamically
        meta = cls.load_meta(doctype)
        if meta:
            cls._metadata[doctype] = meta
            return meta
            
        return None



    @classmethod
    def list_doctypes(cls) -> List[str]:
        """Returns a list of all registered DocType names."""
        return list(cls._registry.keys())
