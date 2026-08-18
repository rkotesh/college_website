import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatsCard from '../../components/StatsCard';

describe('StatsCard Component', () => {
  it('renders label and value accurately', () => {
    render(<StatsCard label="Total Attendance" value="89.5%" />);
    expect(screen.getByText('Total Attendance')).toBeInTheDocument();
    expect(screen.getByText('89.5%')).toBeInTheDocument();
  });

  it('renders custom icon when supplied', () => {
    render(<StatsCard label="CGPA" value="9.4" icon={<span data-testid="cgpa-icon">🎓</span>} />);
    expect(screen.getByTestId('cgpa-icon')).toBeInTheDocument();
    expect(screen.getByText('9.4')).toBeInTheDocument();
  });
});
