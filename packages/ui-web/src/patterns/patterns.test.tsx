import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './empty-state';
import { BusinessCard } from './business-card';
import { ProductCard } from './product-card';
import { FeedPostCard } from './feed-post-card';

describe('EmptyState pattern', () => {
  it('renders title, description and button', async () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="No saved items"
        description="Save your favourite items to view them later."
        actionLabel="Explore"
        onAction={onAction}
      />,
    );

    expect(screen.getByText('No saved items')).toBeInTheDocument();
    expect(screen.getByText('Save your favourite items to view them later.')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Explore' });
    await userEvent.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe('BusinessCard pattern', () => {
  it('renders business information and handles follow & save', async () => {
    const onSave = vi.fn();
    const onFollow = vi.fn();

    render(
      <BusinessCard
        business={{
          id: 'b-1',
          name: 'Apex Textiles',
          slug: 'apex-textiles',
          city: 'Surat',
          state: 'Gujarat',
          establishedYear: 2010,
          about: 'Leading wholesale fabric supplier',
          followersCount: 1200,
          rating: 4.8,
          reviewsCount: 42,
          verified: true,
        }}
        onToggleSave={onSave}
        onToggleFollow={onFollow}
      />,
    );

    expect(screen.getByText('Apex Textiles')).toBeInTheDocument();
    expect(screen.getByText('Surat, Gujarat')).toBeInTheDocument();
    expect(screen.getByText('Est. 2010')).toBeInTheDocument();
    expect(screen.getByText('1,200 followers')).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: 'Save business' });
    await userEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledWith('b-1');

    const followBtn = screen.getByRole('button', { name: '+ Follow' });
    await userEvent.click(followBtn);
    expect(onFollow).toHaveBeenCalledWith('b-1');
  });
});

describe('ProductCard pattern', () => {
  it('renders product information and triggers enquiry', async () => {
    const onEnquire = vi.fn();
    const onSave = vi.fn();

    const product = {
      id: 'p-1',
      title: 'Pure Silk Sarees',
      images: ['https://example.com/saree.jpg'],
      price: 2500,
      originalPrice: 3000,
      minOrderQuantity: 10,
      unit: 'pieces',
      availability: 'In Stock',
      businessId: 'b-1',
      businessName: 'Apex Textiles',
      businessCity: 'Surat',
      rating: 4.9,
    };

    render(<ProductCard product={product} onEnquire={onEnquire} onToggleSave={onSave} />);

    expect(screen.getByText('Pure Silk Sarees')).toBeInTheDocument();
    expect(screen.getByText('Apex Textiles')).toBeInTheDocument();
    expect(screen.getByText('₹2,500')).toBeInTheDocument();
    expect(screen.getByText('MOQ: 10 pieces')).toBeInTheDocument();

    const enquireBtn = screen.getByRole('button', { name: 'Send Enquiry' });
    await userEvent.click(enquireBtn);
    expect(onEnquire).toHaveBeenCalledWith(product);
  });
});

describe('FeedPostCard pattern', () => {
  it('renders post content and handles actions', async () => {
    const onLike = vi.fn();
    const onSave = vi.fn();
    const onShare = vi.fn();
    const onOpenComments = vi.fn();

    const post = {
      id: 'post-1',
      businessId: 'b-1',
      businessName: 'Apex Textiles',
      location: 'Surat',
      createdAt: '2h ago',
      content: 'New monsoon collection now available in wholesale!',
      tags: ['fashion', 'wholesale'],
      likesCount: 24,
      commentsCount: 5,
    };

    render(
      <FeedPostCard
        post={post}
        onToggleLike={onLike}
        onToggleSave={onSave}
        onShare={onShare}
        onOpenComments={onOpenComments}
      />,
    );

    expect(
      screen.getByText('New monsoon collection now available in wholesale!'),
    ).toBeInTheDocument();
    expect(screen.getByText('#fashion')).toBeInTheDocument();

    const likeBtn = screen.getByRole('button', { name: 'Like' });
    await userEvent.click(likeBtn);
    expect(onLike).toHaveBeenCalledWith('post-1');

    const commentBtn = screen.getByRole('button', { name: 'Comments' });
    await userEvent.click(commentBtn);
    expect(onOpenComments).toHaveBeenCalledWith('post-1');

    const shareBtn = screen.getByRole('button', { name: 'Share post' });
    await userEvent.click(shareBtn);
    expect(onShare).toHaveBeenCalledWith(post);
  });
});
