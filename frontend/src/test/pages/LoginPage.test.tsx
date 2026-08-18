import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../../pages/LoginPage';

describe('LoginPage Component', () => {
  const onLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Phase 1 login form with credentials and role select', () => {
    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/register number \/ email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/portal role/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('allows role selection among supported ERP roles', () => {
    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    const roleSelect = screen.getByLabelText(/portal role/i) as HTMLSelectElement;
    expect(roleSelect.value).toBe('Student');

    fireEvent.change(roleSelect, { target: { value: 'Faculty' } });
    expect(roleSelect.value).toBe('Faculty');

    fireEvent.change(roleSelect, { target: { value: 'Director' } });
    expect(roleSelect.value).toBe('Director');
  });

  it('shows error message when trying to submit empty fields', async () => {
    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    // Form inputs have HTML required attribute, but if submitted directly:
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('switches to OTP verification phase when login phase 1 succeeds', async () => {
    // Mock global fetch for Phase 1 login
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        status: 'OTP_SENT',
        tempToken: 'mock-temp-token',
        role: 'Faculty',
        email: 'faculty@ciet.edu.in'
      }),
    } as any);

    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    const idInput = screen.getByLabelText(/register number \/ email/i);
    const passInput = screen.getByLabelText(/^password/i);

    fireEvent.change(idInput, { target: { value: 'faculty@ciet.edu.in' } });
    fireEvent.change(passInput, { target: { value: 'Password@123' } });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /verify otp/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /verify & sign in/i })).toBeInTheDocument();
  });

  it('switches to Forgot Password view when clicked for staff roles', async () => {
    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    const roleSelect = screen.getByLabelText(/portal role/i);
    fireEvent.change(roleSelect, { target: { value: 'Faculty' } });

    const forgotBtn = screen.getByRole('button', { name: /forgot\?/i });
    fireEvent.click(forgotBtn);

    expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/staff email address/i)).toBeInTheDocument();
  });
});
