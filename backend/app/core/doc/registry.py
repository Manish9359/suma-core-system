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
    def get_metadata(cls, doctype: str) -> Optional[DocTypeMetadata]:
        """Resolve a DocType name to its metadata definition."""
        return cls._metadata.get(doctype)

    @classmethod
    def list_doctypes(cls) -> List[str]:
        """Returns a list of all registered DocType names."""
        return list(cls._registry.keys())
