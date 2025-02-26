import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveTextContent: (text: string) => R;
      toHaveClass: (className: string) => R;
      toBeInTheDocument: () => R;
      toBeDisabled: () => R;
    }
  }
}
