import { describe, expect, it } from 'vitest';
import { businessFixture, productFixture, serviceFixture } from './fixtures';
import {
  businessJsonLd,
  businessMetadata,
  listingMetadata,
  productJsonLd,
  serializeJsonLd,
  serviceJsonLd,
} from './seo';

const ORIGIN = 'https://supporters.example';

describe('serializeJsonLd', () => {
  it('escapes characters that could end the script tag', () => {
    const html = serializeJsonLd({ name: '</script><script>alert(1)</script> & co' });
    expect(html).not.toContain('<');
    expect(html).not.toContain('>');
    expect(html).not.toContain('&');
    expect(JSON.parse(html)).toEqual({ name: '</script><script>alert(1)</script> & co' });
  });

  it('escapes the JavaScript line separators', () => {
    expect(serializeJsonLd({ text: 'a\u2028b\u2029c' })).toBe('{"text":"a\\u2028b\\u2029c"}');
  });
});

describe('businessJsonLd', () => {
  it('describes a LocalBusiness with its address and hours', () => {
    const data = businessJsonLd(businessFixture, ORIGIN);
    expect(data).toMatchObject({
      '@type': 'LocalBusiness',
      url: `${ORIGIN}/business/sharma-textiles-surat`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Ring Road',
        addressLocality: 'Surat',
        addressRegion: 'Gujarat',
        postalCode: '395002',
        addressCountry: 'IN',
      },
      sameAs: ['https://sharma.example', 'https://instagram.com/sharma'],
      foundingDate: '2004',
    });
    expect(data.openingHoursSpecification).toContainEqual({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'https://schema.org/Monday',
      opens: '09:00',
      closes: '13:00',
    });
  });

  it('leaves out contact details the owner keeps private', () => {
    const data = businessJsonLd(businessFixture, ORIGIN);
    expect(data).not.toHaveProperty('telephone');
    expect(data).not.toHaveProperty('email');
  });
});

describe('productJsonLd', () => {
  it('has an Offer with the decimal INR price, availability, MOQ and seller', () => {
    expect(productJsonLd(productFixture, ORIGIN)).toMatchObject({
      '@type': 'Product',
      name: 'Cotton poplin',
      image: ['https://media.example/a.webp'],
      offers: {
        '@type': 'Offer',
        price: '149.50',
        priceCurrency: 'INR',
        availability: 'https://schema.org/MadeToOrder',
        eligibleQuantity: { '@type': 'QuantitativeValue', minValue: 100, unitText: 'metre' },
        seller: { name: 'Sharma Textiles', url: `${ORIGIN}/business/sharma-textiles-surat` },
      },
    });
  });

  it('has no Offer when the price is "Ask for price"', () => {
    expect(productJsonLd({ ...productFixture, price: null }, ORIGIN)).not.toHaveProperty('offers');
  });
});

describe('serviceJsonLd', () => {
  it('names the provider and the area served', () => {
    const data = serviceJsonLd(serviceFixture, ORIGIN);
    expect(data).toMatchObject({
      '@type': 'Service',
      serviceType: 'Textiles',
      provider: { '@type': 'LocalBusiness', name: 'Sharma Textiles' },
      areaServed: [
        { '@type': 'City', name: 'Surat' },
        { '@type': 'State', name: 'Gujarat' },
      ],
    });
    expect(data).not.toHaveProperty('offers');
  });

  it('serves All India as a Country', () => {
    const allIndia = { ...serviceFixture.serviceArea, allIndia: true, states: [], cities: [] };
    expect(serviceJsonLd({ ...serviceFixture, serviceArea: allIndia }, ORIGIN).areaServed).toEqual({
      '@type': 'Country',
      name: 'India',
    });
  });
});

describe('metadata', () => {
  it('sets the canonical URL and Open Graph for a business', () => {
    const metadata = businessMetadata(businessFixture, ORIGIN);
    expect(metadata.title).toBe('Sharma Textiles · Textiles in Surat, Gujarat');
    expect(metadata.alternates?.canonical).toBe(`${ORIGIN}/business/sharma-textiles-surat`);
    expect(metadata.openGraph).toMatchObject({
      url: `${ORIGIN}/business/sharma-textiles-surat`,
      images: [{ url: 'https://media.example/logo.webp' }],
    });
  });

  it('uses the first image and the right path for listings', () => {
    const product = listingMetadata(productFixture, ORIGIN);
    expect(product.alternates?.canonical).toBe(`${ORIGIN}/product/${productFixture.id}`);
    expect(product.description).toBe('Soft cotton fabric for shirts.');
    const service = listingMetadata({ ...serviceFixture, images: [] }, ORIGIN);
    expect(service.alternates?.canonical).toBe(`${ORIGIN}/service/${serviceFixture.id}`);
    expect(service.twitter).toMatchObject({ card: 'summary' });
  });
});
