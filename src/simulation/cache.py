from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import json
import logging

logger = logging.getLogger(__name__)

class StateCache:
    def __init__(self, ttl_seconds: float = 1.0):
        self.ttl = ttl_seconds
        self.cache: Dict[str, Any] = {}
        self.last_update: Optional[datetime] = None
        self.previous_state: Optional[Dict[str, Any]] = None
        
    def update(self, state: Dict[str, Any]) -> None:
        """Update the cached state and calculate diffs."""
        self.previous_state = self.cache.copy() if self.cache else None
        self.cache = state
        self.last_update = datetime.now()
        
        if self.previous_state:
            diff = self._calculate_diff(self.previous_state, state)
            logger.debug(f"State diff: {json.dumps(diff, indent=2)}")
    
    def get(self) -> Optional[Dict[str, Any]]:
        """Get the cached state if it's still valid."""
        if not self.is_valid():
            return None
        return self.cache
    
    def get_diff(self) -> Optional[Dict[str, Any]]:
        """Get the difference between current and previous state."""
        if not self.previous_state or not self.cache:
            return None
        return self._calculate_diff(self.previous_state, self.cache)
    
    def is_valid(self) -> bool:
        """Check if the cached state is still valid."""
        if not self.last_update:
            return False
        
        age = datetime.now() - self.last_update
        return age.total_seconds() < self.ttl
    
    def _calculate_diff(self, old_state: Dict[str, Any], 
                       new_state: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate the difference between two states."""
        diff = {
            "countries": {},
            "global_stats": {},
            "mutation_state": {}
        }
        
        # Check global stats changes
        if "global_stats" in old_state and "global_stats" in new_state:
            for key in new_state["global_stats"]:
                old_val = old_state["global_stats"].get(key)
                new_val = new_state["global_stats"].get(key)
                if old_val != new_val:
                    diff["global_stats"][key] = {
                        "old": old_val,
                        "new": new_val
                    }
        
        # Check country changes
        if "countries" in old_state and "countries" in new_state:
            # Find changed or new countries
            for country_id, new_data in new_state["countries"].items():
                if country_id not in old_state["countries"]:
                    diff["countries"][country_id] = {"status": "new", "data": new_data}
                else:
                    old_data = old_state["countries"][country_id]
                    country_diff = {}
                    for key in ["susceptible", "infected", "recovered"]:
                        if old_data.get(key) != new_data.get(key):
                            country_diff[key] = {
                                "old": old_data.get(key),
                                "new": new_data.get(key)
                            }
                    if country_diff:
                        diff["countries"][country_id] = {
                            "status": "changed",
                            "changes": country_diff
                        }
            
            # Find removed countries
            for country_id in old_state["countries"]:
                if country_id not in new_state["countries"]:
                    diff["countries"][country_id] = {
                        "status": "removed"
                    }
        
        # Check mutation state changes
        if "mutation_state" in old_state and "mutation_state" in new_state:
            old_mutation = old_state["mutation_state"]
            new_mutation = new_state["mutation_state"]
            
            if old_mutation.get("strain") != new_mutation.get("strain"):
                diff["mutation_state"]["strain"] = {
                    "old": old_mutation.get("strain"),
                    "new": new_mutation.get("strain")
                }
            
            if old_mutation.get("resistance_factors") != new_mutation.get("resistance_factors"):
                diff["mutation_state"]["resistance_factors"] = {
                    "old": old_mutation.get("resistance_factors"),
                    "new": new_mutation.get("resistance_factors")
                }
        
        return diff if any(diff.values()) else {} 