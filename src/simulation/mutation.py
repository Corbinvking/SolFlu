from typing import Dict, Any
import numpy as np
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class MutationThresholds:
    INFECTION_RATE: float = 0.3  # Trigger mutation when infection rate exceeds this
    RECOVERY_RATE: float = 0.2   # Consider recovery rate in mutation probability
    BASE_MUTATION_CHANCE: float = 0.01  # Base chance per update

class VirusMutation:
    def __init__(self):
        self.current_strain = 0
        self.resistance_factors = {
            "air": 0.0,
            "sea": 0.0,
            "land": 0.0
        }
        self.mutation_history = []
        self.thresholds = MutationThresholds()
    
    def check_mutation_trigger(self, global_stats: Dict[str, float],
                             parameters: Dict[str, Any]) -> bool:
        """Check if conditions are right for a mutation."""
        if not global_stats or not parameters:
            return False
            
        infection_rate = global_stats.get("infection_rate", 0.0)
        recovery_rate = parameters.get("recovery_rate", 1.0)
        
        # Base mutation chance
        mutation_chance = self.thresholds.BASE_MUTATION_CHANCE
        
        # Increase chance based on infection rate
        if infection_rate > self.thresholds.INFECTION_RATE:
            mutation_chance *= (1 + infection_rate)
            
        # Decrease chance based on recovery rate
        if recovery_rate > self.thresholds.RECOVERY_RATE:
            mutation_chance *= (1 - recovery_rate * 0.5)
            
        return np.random.random() < mutation_chance
    
    def mutate(self, global_stats: Dict[str, float]) -> None:
        """Perform mutation and update resistance factors."""
        self.current_strain += 1
        
        # Record mutation event
        mutation_event = {
            "strain": self.current_strain,
            "timestamp": global_stats.get("timestamp", 0),
            "global_infection_rate": global_stats.get("infection_rate", 0)
        }
        self.mutation_history.append(mutation_event)
        
        # Update resistance factors
        for route_type in self.resistance_factors:
            # Random adjustment to resistance (-0.1 to +0.1)
            adjustment = (np.random.random() - 0.5) * 0.2
            self.resistance_factors[route_type] = np.clip(
                self.resistance_factors[route_type] + adjustment,
                0.0, 1.0
            )
        
        logger.info(f"Virus mutated to strain {self.current_strain}")
        logger.debug(f"New resistance factors: {self.resistance_factors}")
    
    def get_current_state(self) -> Dict[str, Any]:
        """Get the current mutation state."""
        return {
            "strain": self.current_strain,
            "resistance_factors": self.resistance_factors.copy(),
            "mutation_count": len(self.mutation_history)
        }
    
    def apply_strain_effects(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Apply strain-specific effects to simulation parameters."""
        modified_params = parameters.copy()
        
        # Each strain potentially increases base infection rate
        strain_modifier = 1.0 + (self.current_strain * 0.05)  # 5% increase per strain
        
        # Apply strain modifier to infection rate
        if "infection_rate" in modified_params:
            modified_params["infection_rate"] *= strain_modifier
        
        return modified_params 