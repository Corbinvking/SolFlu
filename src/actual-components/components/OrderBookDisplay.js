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

    const { buyOrders = [], sellOrders = [], marketCap = 0, volatility = 0, currentPrice = 0 } = marketState;

    // Take 10 orders from each side centered around the current price
    const visibleBuyOrders = buyOrders.slice(0, 10);
    const visibleSellOrders = sellOrders.slice(0, 10);

    return (
        <div style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(0, 0, 0, 0.8)',
            padding: 20,
            borderRadius: 8,
            color: 'white',
            width: 300,
            fontFamily: 'monospace',
            zIndex: 1000
        }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Order Book</h3>
            
            {/* Market Info */}
            <div style={{ marginBottom: 15 }}>
                <div>Market Cap: ${marketCap.toLocaleString()}</div>
                <div>Volatility: {(volatility * 100).toFixed(1)}%</div>
                <div>Current Price: ${currentPrice.toFixed(4)}</div>
            </div>

            {/* Headers */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '1px 6px',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                marginBottom: '5px',
                fontSize: '10px',
                color: '#888'
            }}>
                <span style={{ width: '25px' }}>Age</span>
                <span style={{ width: '50px', textAlign: 'right' }}>Amount</span>
                <span style={{ width: '70px', textAlign: 'right' }}>Price</span>
                <span style={{ width: '45px', textAlign: 'left' }}>ID</span>
            </div>

            {/* Sell Orders (reversed to show highest price first) */}
            <div style={{ marginBottom: '10px' }}>
                {visibleSellOrders.map((order, i) => (
                    <OrderRow key={`sell-${order.makerId}`} order={order} type="sell" />
                ))}
            </div>

            {/* Spread Indicator */}
            <div style={{
                padding: '5px',
                textAlign: 'center',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                margin: '5px 0',
                fontSize: '11px',
                color: '#888'
            }}>
                Spread: ${((visibleSellOrders[0]?.price || 0) - (visibleBuyOrders[0]?.price || 0)).toFixed(4)}
            </div>

            {/* Buy Orders */}
            <div>
                {visibleBuyOrders.map((order, i) => (
                    <OrderRow key={`buy-${order.makerId}`} order={order} type="buy" />
                ))}
            </div>
        </div>
    );
};

export default OrderBookDisplay; 