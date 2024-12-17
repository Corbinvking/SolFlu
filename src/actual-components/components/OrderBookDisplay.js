import React from 'react';

const OrderRow = ({ order, type }) => {
    const style = {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '1px 6px',
        fontSize: '11px',
        fontFamily: 'monospace',
        color: type === 'sell' ? '#ff4444' : '#44ff44',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        alignItems: 'center',
        backgroundColor: type === 'sell' ? 'rgba(255,68,68,0.1)' : 'rgba(68,255,68,0.1)',
        height: '16px'
    };

    return (
        <div style={style}>
            <span style={{ width: '25px', color: '#888' }}>{order.age}</span>
            <span style={{ width: '50px', textAlign: 'right' }}>${order.amount.toFixed(0)}</span>
            <span style={{ width: '70px', textAlign: 'right', color: type === 'sell' ? '#ff4444' : '#44ff44' }}>
                ${order.price.toFixed(4)}
            </span>
            <span style={{ width: '45px', opacity: 0.7, fontSize: '10px', color: '#888' }}>{order.makerId.slice(0, 4)}</span>
        </div>
    );
};

const OrderBookDisplay = ({ marketState }) => {
    if (!marketState) return null;

    const {
        buyOrders,
        sellOrders,
        currentPrice,
        marketCap,
        volatility
    } = marketState;

    const containerStyle = {
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '220px',
        backgroundColor: 'rgba(17, 19, 23, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        color: 'white',
        zIndex: 1000,
        maxHeight: '70vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    };

    const headerStyle = {
        padding: '6px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        fontSize: '11px',
        backgroundColor: 'rgba(255,255,255,0.05)'
    };

    const scrollContainerStyle = {
        overflowY: 'auto',
        maxHeight: 'calc(70vh - 70px)',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.3) transparent',
        backgroundColor: 'rgba(0,0,0,0.2)'
    };

    const currentPriceStyle = {
        padding: '4px',
        backgroundColor: 'rgba(255,255,255,0.1)',
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: 'bold',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        color: '#fff'
    };

    const columnHeaderStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '2px 6px',
        fontSize: '9px',
        color: '#888',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.02)'
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Market Cap:</span>
                    <span>${Math.round(marketCap).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Volatility:</span>
                    <span>{(volatility * 100).toFixed(1)}%</span>
                </div>
            </div>
            
            <div style={columnHeaderStyle}>
                <span style={{ width: '25px' }}>TIME</span>
                <span style={{ width: '50px', textAlign: 'right' }}>SIZE</span>
                <span style={{ width: '70px', textAlign: 'right' }}>PRICE</span>
                <span style={{ width: '45px' }}>ID</span>
            </div>
            
            <div style={scrollContainerStyle}>
                {/* Sell Orders */}
                <div>
                    {sellOrders.slice(0, 15).map((order, i) => (
                        <OrderRow key={order.makerId} order={order} type="sell" />
                    ))}
                </div>

                {/* Current Price */}
                <div style={currentPriceStyle}>
                    ${currentPrice.toFixed(4)}
                </div>

                {/* Buy Orders */}
                <div>
                    {buyOrders.slice(0, 15).map((order, i) => (
                        <OrderRow key={order.makerId} order={order} type="buy" />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OrderBookDisplay; 