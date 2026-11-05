import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BusinessReviewsTab } from './BusinessReviewsTab';

describe('BusinessReviewsTab (mobile spec line 45 & 70)', () => {
  it('renders average review score and list of reviews', async () => {
    const { getByText } = await render(<BusinessReviewsTab businessName="Surat Silk Craft" />);
    expect(getByText(/Verified Reviews/)).toBeTruthy();
    expect(getByText('Rajesh Sharma')).toBeTruthy();
    expect(getByText(/Exceptional quality textiles/)).toBeTruthy();
  });

  it('increments helpful count on tap', async () => {
    const { getByTestId, findByText } = await render(
      <BusinessReviewsTab businessName="Surat Silk Craft" />,
    );
    const helpfulBtn = getByTestId('helpful-rev-1');
    fireEvent.press(helpfulBtn);
    expect(await findByText(/Helpful.*15/)).toBeTruthy();
  });
});
