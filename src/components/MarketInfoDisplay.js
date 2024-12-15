import React from 'react';

const formatNumber = (num) => {
    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
        return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toFixed(2);
};

const MarketInfoDisplay = ({ 
    marketCap, 
    volatility, 
    activeCenters, 
    activeRoutes,
    fps,
    updateLatency
}) => {
    return (
        <div className="market-info-display" style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(0, 0, 0, 0.85)',
            padding: '20px',
            borderRadius: '10px',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minWidth: '300px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000
        }}>
            <h2 style={{ 
                margin: '0 0 15px 0',
                fontSize: '1.2em',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                paddingBottom: '10px'
            }}>
                Market Activity Monitor
            </h2>
            
            <div style={{ marginBottom: '20px' }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '10px'
                }}>
                    <span>Market Cap:</span>
                    <span style={{ 
                        color: '#4CAF50',
                        fontWeight: 'bold'
                    }}>
                        ${formatNumber(marketCap)}
                    </span>
                </div>
                
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '10px'
                }}>
                    <span>Volatility:</span>
                    <span style={{
                        color: volatility > 0.7 ? '#FF5252' : 
                              volatility > 0.4 ? '#FFC107' : '#4CAF50',
                        fontWeight: 'bold'
                    }}>
                        {(volatility * 100).toFixed(1)}%
                    </span>
                </div>
            </div>

            <div style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '10px',
                borderRadius: '5px',
                marginBottom: '20px'
            }}>
                <h3 style={{ 
                    margin: '0 0 10px 0',
                    fontSize: '1em',
                    color: '#90CAF9'
                }}>
                    Spread Statistics
                </h3>
                
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '5px'
                }}>
                    <span>Active Centers:</span>
                    <span style={{ color: '#64B5F6' }}>{activeCenters}</span>
                </div>
                
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between'
                }}>
                    <span>Active Routes:</span>
                    <span style={{ color: '#64B5F6' }}>{activeRoutes}</span>
                </div>
            </div>

            <div style={{ 
                fontSize: '0.9em',
                color: 'rgba(255, 255, 255, 0.7)'
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '5px'
                }}>
                    <span>FPS:</span>
                    <span style={{
                        color: fps >= 55 ? '#4CAF50' : 
                              fps >= 30 ? '#FFC107' : '#FF5252'
                    }}>
                        {fps.toFixed(1)}
                    </span>
                </div>
                
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between'
                }}>
                    <span>Update Latency:</span>
                    <span style={{
                        color: updateLatency <= 16 ? '#4CAF50' : 
                              updateLatency <= 32 ? '#FFC107' : '#FF5252'
                    }}>
                        {updateLatency.toFixed(1)}ms
                    </span>
                </div>
            </div>
        </div>
    );
};

export default MarketInfoDisplay; 