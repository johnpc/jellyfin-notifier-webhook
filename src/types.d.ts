// Type declarations to fix compatibility issues

// Fix for ErrorOptions not being available in older TypeScript versions
interface ErrorOptions {
  cause?: unknown;
}
