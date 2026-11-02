import type { Service } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { z } from 'zod';
import { useApp } from '../../context/AppContext';
import { parseRouteParam } from '../../lib/navigation/params';
import { useRequireSession } from '../navigation/use-require-session';
import { DetailRow, ImageGallery, QueryState, Section, SellerCard } from './components';
import { SERVICE_AVAILABILITY_LABELS, areaLabel, servicePriceLabel } from './format';
import { useService } from './queries';

/** `service/[id]`: a published service (mobile spec, Structure). */
export function ServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useService(parseRouteParam(z.uuid(), id));

  if (!query.data) {
    return (
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        notFoundTitle="Service not found"
      />
    );
  }
  return <ServicePage service={query.data} />;
}

function ServicePage({ service }: { service: Service }) {
  const { openEnquiryModal } = useApp();
  const requireSession = useRequireSession();

  const handleEnquire = () =>
    requireSession(() =>
      openEnquiryModal({
        title: service.title,
        businessName: service.business.name,
        businessId: service.business.id,
      }),
    );

  return (
    <ScrollView className="bg-background flex-1" contentContainerClassName="pb-10">
      <ImageGallery images={service.images} label={service.title} />
      <View className="gap-5 p-4">
        <View className="gap-1">
          <Text variant="h4">{service.title}</Text>
          <Text className="text-primary text-xl font-semibold">{servicePriceLabel(service)}</Text>
          <Text variant="muted">{service.category.name}</Text>
        </View>

        <Button onPress={handleEnquire} accessibilityHint="Ask the provider about this service">
          <Text>{service.price ? 'Send enquiry' : 'Ask for price'}</Text>
        </Button>

        <SellerCard business={service.business} />

        <Section title="Details">
          <DetailRow
            label="Availability"
            value={SERVICE_AVAILABILITY_LABELS[service.availability]}
          />
          <DetailRow label="Turnaround" value={service.turnaround} />
          <DetailRow label="Serves" value={areaLabel(service.serviceArea)} />
        </Section>

        {service.features.length > 0 && (
          <Section title="What's included">
            {service.features.map((feature) => (
              <Text key={feature}>• {feature}</Text>
            ))}
          </Section>
        )}

        <Section title="Description">
          <Text>{service.description}</Text>
        </Section>
      </View>
    </ScrollView>
  );
}
