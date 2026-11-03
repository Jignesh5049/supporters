import { render, screen, userEvent } from '@testing-library/react-native';
import * as React from 'react';
import { BusinessCard, EmptyState, FeedPostCard, ProductCard } from './index';

describe('UI Native Patterns', () => {
  describe('EmptyState', () => {
    it('renders title and description properly', async () => {
      await render(
        <EmptyState
          title="No Products Found"
          description="Try modifying your filters or search keywords."
        />,
      );

      expect(screen.getByText('No Products Found')).toBeTruthy();
      expect(screen.getByText('Try modifying your filters or search keywords.')).toBeTruthy();
    });

    it('triggers action button callback on press', async () => {
      const user = userEvent.setup();
      const onAction = jest.fn();

      await render(
        <EmptyState title="No Results" actionLabel="Clear Filters" onAction={onAction} />,
      );

      const actionButton = screen.getByRole('button', { name: 'Clear Filters' });
      await user.press(actionButton);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('BusinessCard', () => {
    const mockBusiness = {
      id: 'biz_1',
      name: 'Gujarat Textiles Hub',
      category: 'Textile Manufacturers',
      city: 'Surat',
      isVerified: true,
      isPremium: true,
      rating: 4.8,
      followersCount: 1250,
    };

    it('renders business details, badge, and ratings', async () => {
      await render(
        <BusinessCard business={mockBusiness} onFollow={jest.fn()} onEnquiry={jest.fn()} />,
      );

      expect(screen.getByText('Gujarat Textiles Hub')).toBeTruthy();
      expect(screen.getByText('Textile Manufacturers')).toBeTruthy();
      expect(screen.getByText('Surat')).toBeTruthy();
      expect(screen.getByText('PRO')).toBeTruthy();
      expect(screen.getByText('4.8')).toBeTruthy();
      expect(screen.getByText('1,250 followers')).toBeTruthy();
    });

    it('calls onFollow when follow button is pressed', async () => {
      const user = userEvent.setup();
      const onFollow = jest.fn();

      await render(<BusinessCard business={mockBusiness} onFollow={onFollow} />);

      const followBtn = screen.getByRole('button', { name: 'Follow' });
      await user.press(followBtn);
      expect(onFollow).toHaveBeenCalledTimes(1);
    });
  });

  describe('ProductCard', () => {
    const mockProduct = {
      id: 'prod_1',
      title: 'Pure Organic Cotton Fabric 60s Count',
      price: 240,
      currency: 'INR',
      moq: 500,
      unit: 'meters',
      businessName: 'Surat Silk Craft',
    };

    it('renders price formatted in Indian Rupees and MOQ badge', async () => {
      await render(<ProductCard product={mockProduct} onEnquiry={jest.fn()} />);

      expect(screen.getByText('Pure Organic Cotton Fabric 60s Count')).toBeTruthy();
      expect(screen.getByText('₹240')).toBeTruthy();
      expect(screen.getByText('/ meters')).toBeTruthy();
      expect(screen.getByText('Min. Order: 500 meters')).toBeTruthy();
      expect(screen.getByText('Surat Silk Craft')).toBeTruthy();
    });

    it('calls onEnquiry when Request Quote is clicked', async () => {
      const user = userEvent.setup();
      const onEnquiry = jest.fn();

      await render(<ProductCard product={mockProduct} onEnquiry={onEnquiry} />);

      const quoteBtn = screen.getByRole('button', { name: 'Request Quote' });
      await user.press(quoteBtn);
      expect(onEnquiry).toHaveBeenCalledTimes(1);
    });
  });

  describe('FeedPostCard', () => {
    const mockPost = {
      id: 'post_1',
      authorName: 'Rajesh Sharma',
      authorBusinessName: 'Sharma Industrial Tools',
      isVerified: true,
      timeAgo: '2h ago',
      content:
        'We have updated our CNC tooling inventory for wholesale distribution across Gujarat.',
      likesCount: 42,
      commentsCount: 7,
      isLiked: false,
    };

    it('renders author info, content and counts', async () => {
      await render(
        <FeedPostCard
          post={mockPost}
          onLike={jest.fn()}
          onComment={jest.fn()}
          onShare={jest.fn()}
        />,
      );

      expect(screen.getByText('Rajesh Sharma')).toBeTruthy();
      expect(screen.getByText('Sharma Industrial Tools')).toBeTruthy();
      expect(screen.getByText('• 2h ago')).toBeTruthy();
      expect(
        screen.getByText(
          'We have updated our CNC tooling inventory for wholesale distribution across Gujarat.',
        ),
      ).toBeTruthy();
      expect(screen.getByText('42')).toBeTruthy();
      expect(screen.getByText('7')).toBeTruthy();
    });

    it('calls onLike when like button is pressed', async () => {
      const user = userEvent.setup();
      const onLike = jest.fn();

      await render(<FeedPostCard post={mockPost} onLike={onLike} />);

      const likeBtn = screen.getByRole('button', { name: 'Like' });
      await user.press(likeBtn);
      expect(onLike).toHaveBeenCalledTimes(1);
    });
  });
});
