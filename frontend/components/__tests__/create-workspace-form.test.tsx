import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateWorkspaceForm } from '../create-workspace-form';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe('CreateWorkspaceForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form correctly', () => {
    render(<CreateWorkspaceForm />);
    expect(screen.getByRole('heading', { name: /Create workspace/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('requires name input', async () => {
    render(<CreateWorkspaceForm />);
    
    const createButton = screen.getByRole('button', { name: 'Create' });
    expect(createButton).toBeDisabled();
  });

  it('submits the form successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'workspace-1', name: 'Test Workspace' }),
    });

    render(<CreateWorkspaceForm />);
    
    const nameInput = screen.getByPlaceholderText('Name');
    const createButton = screen.getByRole('button', { name: 'Create' });

    // Using userEvent to type
    await userEvent.type(nameInput, 'Test Workspace');
    expect(createButton).toBeEnabled();

    // Submit
    fireEvent.click(createButton);

    // Verify fetch was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings/workspaces', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
    });
  });
});
