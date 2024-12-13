import { LayerManager } from '../src/components/map-control/layer-manager';
import { AnimationController } from '../src/utils/animation-utils';

describe('Layer Management System', () => {
  let layerManager;

  beforeEach(() => {
    layerManager = new LayerManager();
  });

  test('should initialize with empty layers', () => {
    expect(layerManager.getLayers()).toHaveLength(0);
  });

  test('should add route layers correctly', () => {
    const testRoutes = {
      routes: [
        {
          source: [-122.4194, 37.7749],
          target: [-74.0060, 40.7128],
          type: 'air',
          intensity: 1.0
        }
      ]
    };

    layerManager.addAnimatedRoutes('test', testRoutes);
    const layers = layerManager.getLayers();
    
    expect(layers).toHaveLength(3); // heatmap, points, arcs
    expect(layers.map(l => l.id)).toContain('test-heatmap');
    expect(layers.map(l => l.id)).toContain('test-points');
    expect(layers.map(l => l.id)).toContain('test-arcs');
  });

  test('should clear layers', () => {
    const testRoutes = {
      routes: [
        {
          source: [-122.4194, 37.7749],
          target: [-74.0060, 40.7128],
          type: 'air',
          intensity: 1.0
        }
      ]
    };

    layerManager.addAnimatedRoutes('test', testRoutes);
    layerManager.clear();
    expect(layerManager.getLayers()).toHaveLength(0);
  });
});

describe('Animation System', () => {
  let animationController;

  beforeEach(() => {
    animationController = new AnimationController();
  });

  test('should initialize in stopped state', () => {
    expect(animationController.animationState).toBe('stopped');
  });

  test('should handle play/pause/stop', () => {
    animationController.play();
    expect(animationController.animationState).toBe('playing');

    animationController.pause();
    expect(animationController.animationState).toBe('paused');

    animationController.stop();
    expect(animationController.animationState).toBe('stopped');
  });

  test('should execute frame callbacks', () => {
    const mockCallback = jest.fn();
    animationController.setOnFrame(mockCallback);
    animationController.play();
    
    // Fast-forward animation
    jest.advanceTimersByTime(1000);
    expect(mockCallback).toHaveBeenCalled();
  });
});

describe('Performance Tests', () => {
  let layerManager;

  beforeEach(() => {
    layerManager = new LayerManager();
  });

  test('should handle large datasets', () => {
    const largeRouteSet = {
      routes: Array(1000).fill(null).map(() => ({
        source: [-122.4194, 37.7749],
        target: [-74.0060, 40.7128],
        type: 'air',
        intensity: Math.random()
      }))
    };

    const startTime = performance.now();
    layerManager.addAnimatedRoutes('test', largeRouteSet);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(1000); // Should process in under 1 second
    expect(layerManager.getLayers()).toHaveLength(3);
  });

  test('should maintain performance during animations', () => {
    const testRoutes = {
      routes: [
        {
          source: [-122.4194, 37.7749],
          target: [-74.0060, 40.7128],
          type: 'air',
          intensity: 1.0
        }
      ]
    };

    const controller = layerManager.addAnimatedRoutes('test', testRoutes);
    const frames = [];
    
    // Collect frame timings
    controller.setOnFrame((progress) => {
      frames.push(performance.now());
    });

    controller.play();
    jest.advanceTimersByTime(1000);

    // Check frame timing consistency
    const intervals = frames.slice(1).map((t, i) => t - frames[i]);
    const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
    
    expect(avgInterval).toBeLessThan(17); // Target 60fps (16.67ms)
  });
}); 