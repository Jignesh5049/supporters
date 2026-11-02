import {
  MEDIA_LIMITS,
  type CategoryTree,
  type Media,
  type UploadPurpose,
} from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Input } from '@supporters/ui-native/components/input';
import { Label } from '@supporters/ui-native/components/label';
import { Text } from '@supporters/ui-native/components/text';
import { Textarea } from '@supporters/ui-native/components/textarea';
import * as ImagePicker from 'expo-image-picker';
import { type ComponentProps, useId, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { messageForError } from '../../lib/api';
import { useCategories } from '../catalog/queries';
import { useUploadImage } from './queries';

export function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <Text className="text-destructive text-sm" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

type TextFieldProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChangeText'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  hint?: string;
  multiline?: boolean;
};

/** A labelled input with its error underneath. */
export function TextField({ label, error, hint, multiline, ...inputProps }: TextFieldProps) {
  const id = useId();
  const Control = multiline ? Textarea : Input;
  return (
    <View className="gap-1.5">
      <Label nativeID={id}>{label}</Label>
      <Control
        aria-labelledby={id}
        accessibilityLabel={label}
        aria-invalid={Boolean(error)}
        {...inputProps}
      />
      {hint && !error && <Text variant="muted">{hint}</Text>}
      <FieldError message={error} />
    </View>
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

/** A short list of options as toggle buttons (the library has no select yet). */
export function ChoiceField<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T | '';
  onChange: (value: T) => void;
  error?: string;
}) {
  return (
    <View className="gap-1.5" accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Label>{label}</Label>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Button
              key={option.value}
              size="sm"
              variant={isSelected ? 'default' : 'outline'}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <Text>{option.label}</Text>
            </Button>
          );
        })}
      </View>
      <FieldError message={error} />
    </View>
  );
}

/** The category tree node holding `id`, whether `id` is a category or one of its subcategories. */
export function findParentCategory(tree: CategoryTree[], id: string): CategoryTree | undefined {
  return tree.find(
    (category) =>
      category.id === id || category.subcategories.some((subcategory) => subcategory.id === id),
  );
}

/**
 * Category, then an optional subcategory. The chosen id is the subcategory when there is one.
 * `topLevelOnly` is for businesses, which take a top-level category.
 */
export function CategoryField({
  value,
  onChange,
  error,
  topLevelOnly = false,
}: {
  value: string;
  onChange: (id: string) => void;
  error?: string;
  topLevelOnly?: boolean;
}) {
  const query = useCategories();
  if (query.isLoading) return <Text variant="muted">Loading categories…</Text>;
  if (!query.data) {
    return (
      <View className="gap-1.5">
        <Label>Category</Label>
        <Button variant="outline" onPress={() => void query.refetch()}>
          <Text>Couldn't load categories. Try again</Text>
        </Button>
      </View>
    );
  }
  const parent = findParentCategory(query.data, value);
  return (
    <View className="gap-3">
      <ChoiceField
        label="Category"
        options={query.data.map((category) => ({ value: category.id, label: category.name }))}
        value={parent?.id ?? ''}
        onChange={onChange}
        error={error}
      />
      {!topLevelOnly && parent && parent.subcategories.length > 0 && (
        <ChoiceField
          label="Subcategory (optional)"
          options={parent.subcategories.map((sub) => ({ value: sub.id, label: sub.name }))}
          value={value === parent.id ? '' : value}
          onChange={onChange}
        />
      )}
    </View>
  );
}

/**
 * Picks photos, uploads each one (presign → PUT → complete) and lists them with a remove button.
 * The form only keeps uploads the API has accepted.
 */
export function ImagesField({
  label,
  images,
  onChange,
  max = MEDIA_LIMITS.imagesPerListing.max,
  purpose,
  error,
}: {
  label: string;
  images: Media[];
  onChange: (images: Media[]) => void;
  max?: number;
  purpose?: UploadPurpose;
  error?: string;
}) {
  const upload = useUploadImage(purpose);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const remaining = max - images.length;

  const handlePick = async () => {
    setUploadError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled) return;
    let next = images;
    for (const asset of result.assets.slice(0, remaining)) {
      try {
        const media = await upload.mutateAsync({ uri: asset.uri, mimeType: asset.mimeType });
        next = [...next, media];
        onChange(next);
      } catch (uploadFailure) {
        setUploadError(messageForError(uploadFailure));
        break;
      }
    }
  };

  return (
    <View className="gap-1.5">
      <Label>{label}</Label>
      <View className="flex-row flex-wrap gap-2">
        {images.map((image, index) => (
          <Pressable
            key={image.id}
            onPress={() => onChange(images.filter((item) => item.id !== image.id))}
            accessibilityRole="button"
            accessibilityLabel={`Remove photo ${index + 1}`}
          >
            <Image source={{ uri: image.url }} className="bg-muted h-20 w-20 rounded-lg" />
            <Text variant="muted" className="text-center">
              Remove
            </Text>
          </Pressable>
        ))}
      </View>
      {remaining > 0 && (
        <Button variant="outline" onPress={() => void handlePick()} disabled={upload.isPending}>
          <Text>
            {upload.isPending ? 'Uploading…' : images.length ? 'Add more photos' : 'Add photos'}
          </Text>
        </Button>
      )}
      <FieldError message={uploadError ?? error} />
    </View>
  );
}
