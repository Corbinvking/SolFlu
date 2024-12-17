import React, { useState } from 'react';
import styled from 'styled-components';

const PanelContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(28, 32, 38, 0.95);
  border: 1px solid #2a2e35;
  border-radius: 8px;
  padding: 15px;
  color: #fff;
  font-family: 'Inter', sans-serif;
  z-index: 1000;
  min-width: 200px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #2a2e35;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #8f9ba8;
`;

const ControlButton = styled.button`
  background: #2a2e35;
  border: 1px solid #3a3f48;
  border-radius: 4px;
  color: #fff;
  padding: 8px 12px;
  margin: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #3a3f48;
    border-color: #4a4f58;
  }

  &:active {
    transform: scale(0.98);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DevPanel = ({ onVirusBoost, onVirusSuppress, onResetSimulation }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <PanelContainer>
      <PanelHeader>
        <Title>Development Controls</Title>
        <ControlButton 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ padding: '4px 8px' }}
        >
          {isCollapsed ? '+' : '-'}
        </ControlButton>
      </PanelHeader>
      
      {!isCollapsed && (
        <ButtonGroup>
          <ControlButton onClick={onVirusBoost}>
            Boost Virus Spread
          </ControlButton>
          <ControlButton onClick={onVirusSuppress}>
            Suppress Virus
          </ControlButton>
          <ControlButton onClick={onResetSimulation}>
            Reset Simulation
          </ControlButton>
        </ButtonGroup>
      )}
    </PanelContainer>
  );
};

export default DevPanel; 