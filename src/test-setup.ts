// Test setup file for vitest
import { vi } from 'vitest';

// Mock FileSystemFileHandle for tests
global.FileSystemFileHandle = class MockFileSystemFileHandle {
  constructor(public name: string) {}
} as any;

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock document.createElement for download testing
const mockLink = {
  href: '',
  download: '',
  click: vi.fn()
};

global.document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'a') {
    return mockLink;
  }
  return {} as any;
});

// Mock document.body methods
const mockBody = {
  appendChild: vi.fn(),
  removeChild: vi.fn()
};

Object.defineProperty(global.document, 'body', {
  value: mockBody,
  writable: true
});
