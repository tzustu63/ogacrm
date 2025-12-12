/**
 * Cross-Browser Compatibility Tests
 * 測試跨瀏覽器相容性
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { store } from '../../store';
import { theme } from '../../theme';
import SchoolList from '../../components/schools/SchoolList';
import SchoolForm from '../../components/schools/SchoolForm';
import ContactForm from '../../components/contacts/ContactForm';
import SearchInput from '../../components/search/SearchInput';
import InteractionTimeline from '../../components/interactions/InteractionTimeline';

// Mock different browser environments
const mockUserAgents = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
};

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

describe('Cross-Browser Compatibility', () => {
  beforeEach(() => {
    // Reset any browser-specific mocks
    jest.clearAllMocks();
  });

  describe('Core Component Rendering', () => {
    Object.entries(mockUserAgents).forEach(([browser, userAgent]) => {
      describe(`${browser.toUpperCase()} Browser`, () => {
        beforeEach(() => {
          // Mock user agent for each browser
          Object.defineProperty(navigator, 'userAgent', {
            value: userAgent,
            configurable: true
          });
        });

        it('should render SchoolList component correctly', () => {
          render(
            <TestWrapper>
              <SchoolList />
            </TestWrapper>
          );

          expect(screen.getByText(/學校列表/i)).toBeInTheDocument();
          expect(screen.getByRole('button', { name: /新增學校/i })).toBeInTheDocument();
        });

        it('should render SchoolForm with all form fields', () => {
          const mockOnSubmit = jest.fn();
          const mockOnCancel = jest.fn();

          render(
            <TestWrapper>
              <SchoolForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </TestWrapper>
          );

          expect(screen.getByLabelText(/學校名稱/i)).toBeInTheDocument();
          expect(screen.getByLabelText(/國家地區/i)).toBeInTheDocument();
          expect(screen.getByLabelText(/學校類型/i)).toBeInTheDocument();
          expect(screen.getByRole('button', { name: /儲存/i })).toBeInTheDocument();
        });

        it('should render ContactForm with proper validation', async () => {
          const user = userEvent.setup();
          const mockOnSubmit = jest.fn();

          render(
            <TestWrapper>
              <ContactForm onSubmit={mockOnSubmit} />
            </TestWrapper>
          );

          const nameInput = screen.getByLabelText(/姓名/i);
          const emailInput = screen.getByLabelText(/電子郵件/i);
          const submitButton = screen.getByRole('button', { name: /儲存/i });

          // Test form validation
          await user.click(submitButton);
          await waitFor(() => {
            expect(screen.getByText(/姓名為必填欄位/i)).toBeInTheDocument();
          });

          // Test email validation
          await user.type(emailInput, 'invalid-email');
          await user.click(submitButton);
          await waitFor(() => {
            expect(screen.getByText(/請輸入有效的電子郵件地址/i)).toBeInTheDocument();
          });
        });

        it('should handle search input interactions', async () => {
          const user = userEvent.setup();
          const mockOnSearch = jest.fn();

          render(
            <TestWrapper>
              <SearchInput onSearch={mockOnSearch} />
            </TestWrapper>
          );

          const searchInput = screen.getByPlaceholderText(/搜尋學校/i);
          
          await user.type(searchInput, '測試學校');
          await user.keyboard('{Enter}');

          expect(mockOnSearch).toHaveBeenCalledWith('測試學校');
        });
      });
    });
  });

  describe('Browser-Specific Features', () => {
    it('should handle localStorage across browsers', () => {
      const testData = { key: 'testValue', timestamp: Date.now() };
      
      // Test localStorage availability
      expect(typeof Storage).toBe('function');
      
      // Test setting and getting data
      localStorage.setItem('testData', JSON.stringify(testData));
      const retrievedData = JSON.parse(localStorage.getItem('testData') || '{}');
      
      expect(retrievedData.key).toBe(testData.key);
      
      // Cleanup
      localStorage.removeItem('testData');
    });

    it('should handle sessionStorage across browsers', () => {
      const testData = { sessionKey: 'sessionValue' };
      
      // Test sessionStorage availability
      expect(typeof Storage).toBe('function');
      
      // Test setting and getting data
      sessionStorage.setItem('sessionData', JSON.stringify(testData));
      const retrievedData = JSON.parse(sessionStorage.getItem('sessionData') || '{}');
      
      expect(retrievedData.sessionKey).toBe(testData.sessionKey);
      
      // Cleanup
      sessionStorage.removeItem('sessionData');
    });

    it('should handle fetch API across browsers', async () => {
      // Mock fetch for testing
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'test' }),
          headers: new Headers(),
          status: 200,
          statusText: 'OK'
        })
      ) as jest.Mock;

      const response = await fetch('/api/test');
      const data = await response.json();

      expect(fetch).toHaveBeenCalledWith('/api/test');
      expect(data.data).toBe('test');
    });

    it('should handle Date objects consistently', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      
      // Test date formatting
      expect(testDate.toISOString()).toBe('2024-01-15T10:30:00.000Z');
      
      // Test date parsing
      const parsedDate = new Date(testDate.toISOString());
      expect(parsedDate.getTime()).toBe(testDate.getTime());
      
      // Test locale-specific formatting
      const localeString = testDate.toLocaleDateString('zh-TW');
      expect(typeof localeString).toBe('string');
    });
  });

  describe('CSS and Layout Compatibility', () => {
    it('should render responsive layouts correctly', () => {
      // Mock different viewport sizes
      const viewports = [
        { width: 320, height: 568 },  // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];

      viewports.forEach(viewport => {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height,
        });

        render(
          <TestWrapper>
            <SchoolList />
          </TestWrapper>
        );

        // Component should render without errors at any viewport size
        expect(screen.getByText(/學校列表/i)).toBeInTheDocument();
      });
    });

    it('should handle CSS Grid and Flexbox layouts', () => {
      const testElement = document.createElement('div');
      testElement.style.display = 'grid';
      testElement.style.gridTemplateColumns = '1fr 1fr';
      
      expect(testElement.style.display).toBe('grid');
      expect(testElement.style.gridTemplateColumns).toBe('1fr 1fr');

      // Test flexbox
      testElement.style.display = 'flex';
      testElement.style.justifyContent = 'space-between';
      
      expect(testElement.style.display).toBe('flex');
      expect(testElement.style.justifyContent).toBe('space-between');
    });
  });

  describe('Event Handling Compatibility', () => {
    it('should handle click events consistently', async () => {
      const user = userEvent.setup();
      const mockClick = jest.fn();

      render(
        <TestWrapper>
          <button onClick={mockClick}>Test Button</button>
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /test button/i });
      await user.click(button);

      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard events consistently', async () => {
      const user = userEvent.setup();
      const mockKeyDown = jest.fn();

      render(
        <TestWrapper>
          <input onKeyDown={mockKeyDown} placeholder="Test Input" />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText(/test input/i);
      await user.type(input, 'test');

      expect(mockKeyDown).toHaveBeenCalled();
    });

    it('should handle form submission consistently', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn((e) => e.preventDefault());

      render(
        <TestWrapper>
          <form onSubmit={mockSubmit}>
            <input name="test" />
            <button type="submit">Submit</button>
          </form>
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Across Browsers', () => {
    it('should render large lists efficiently', () => {
      const startTime = performance.now();
      
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `School ${i}`,
        country: '台灣',
        region: '台北市'
      }));

      render(
        <TestWrapper>
          <div>
            {largeDataSet.map(school => (
              <div key={school.id}>{school.name}</div>
            ))}
          </div>
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Rendering should complete within reasonable time (2 seconds)
      expect(renderTime).toBeLessThan(2000);
    });

    it('should handle rapid state updates efficiently', async () => {
      const user = userEvent.setup();
      let updateCount = 0;
      
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        
        React.useEffect(() => {
          updateCount++;
        }, [count]);

        return (
          <button onClick={() => setCount(c => c + 1)}>
            Count: {count}
          </button>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      
      // Perform rapid clicks
      for (let i = 0; i < 10; i++) {
        await user.click(button);
      }

      // Should handle updates without excessive re-renders
      expect(updateCount).toBeLessThanOrEqual(15); // Allow some buffer for React's batching
    });
  });

  describe('Accessibility Across Browsers', () => {
    it('should maintain ARIA attributes correctly', () => {
      render(
        <TestWrapper>
          <button aria-label="Close dialog" aria-expanded="false">
            ×
          </button>
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /close dialog/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <div>
            <button>First</button>
            <button>Second</button>
            <button>Third</button>
          </div>
        </TestWrapper>
      );

      const firstButton = screen.getByRole('button', { name: /first/i });
      const secondButton = screen.getByRole('button', { name: /second/i });

      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      await user.keyboard('{Tab}');
      expect(document.activeElement).toBe(secondButton);
    });

    it('should announce screen reader content correctly', () => {
      render(
        <TestWrapper>
          <div role="alert" aria-live="polite">
            操作成功完成
          </div>
        </TestWrapper>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
      expect(alert).toHaveTextContent('操作成功完成');
    });
  });
});