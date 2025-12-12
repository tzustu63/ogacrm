/**
 * Simple E2E Test
 * 簡單的端到端測試驗證
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { store } from '../../store';
import { theme } from '../../theme';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={store}>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </BrowserRouter>
  </Provider>
);

describe('Simple E2E Tests', () => {
  it('should render a basic component', () => {
    render(
      <TestWrapper>
        <div>Hello World</div>
      </TestWrapper>
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should handle basic interactions', async () => {
    const user = userEvent.setup();
    
    const TestComponent = () => {
      const [count, setCount] = React.useState(0);
      return (
        <div>
          <span data-testid="count">{count}</span>
          <button onClick={() => setCount(c => c + 1)}>Increment</button>
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    
    const button = screen.getByRole('button', { name: /increment/i });
    await user.click(button);
    
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});