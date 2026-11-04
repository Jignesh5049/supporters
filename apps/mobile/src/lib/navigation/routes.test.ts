import { hrefForRoute, routeForPath } from './routes';

describe('hrefForRoute', () => {
  it('maps static screens to their paths', () => {
    expect(hrefForRoute('home')).toBe('/');
    expect(hrefForRoute('saved')).toBe('/saved');
    expect(hrefForRoute('business_posts')).toBe('/hub/posts');
    expect(hrefForRoute('verify_otp')).toBe('/verify-otp');
  });

  it('puts ids in the path, encoded', () => {
    expect(hrefForRoute('business_detail', { slug: 'asha-traders' })).toBe(
      '/business/asha-traders',
    );
    expect(hrefForRoute('business_detail', { businessId: 'a/b' })).toBe('/business/a%2Fb');
    expect(hrefForRoute('product_detail', { productId: 'p1' })).toBe('/product/p1');
    expect(hrefForRoute('service_detail', { serviceId: 's1' })).toBe('/service/s1');
  });

  it('returns null when a detail screen has no id', () => {
    expect(hrefForRoute('product_detail', {})).toBeNull();
    expect(hrefForRoute('business_detail', { slug: '' })).toBeNull();
  });
});

describe('routeForPath', () => {
  it('finds the screen for a path', () => {
    expect(routeForPath('/')).toBe('home');
    expect(routeForPath('/discover')).toBe('discover');
    expect(routeForPath('/business/asha-traders')).toBe('business_detail');
    expect(routeForPath('/messages/c1')).toBe('chat');
  });

  it('returns null for paths without a prototype name', () => {
    expect(routeForPath('/requirements/new')).toBeNull();
  });
});
