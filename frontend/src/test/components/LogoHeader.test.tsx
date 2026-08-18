import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LogoHeader from '../../components/LogoHeader';

describe('LogoHeader Component', () => {
  it('renders the college logo with proper alt text', () => {
    render(<LogoHeader alt="Chalapathi Institute Logo" />);
    const logo = screen.getByAltText('Chalapathi Institute Logo');
    expect(logo).toBeInTheDocument();
  });

  it('renders with fallback badge container', () => {
    const { container } = render(<LogoHeader />);
    const fallback = container.querySelector('.ciet-brand-badge-fallback');
    expect(fallback).toBeInTheDocument();
    expect(fallback?.textContent).toBe('CIET');
  });
});
