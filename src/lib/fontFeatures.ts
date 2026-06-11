import type { CodingFont } from './codingFonts';

type FontFeatureConfig = Pick<
  CodingFont,
  'family' | 'openTypeFeatures' | 'ligatureFeatures'
>;

export function getFontFeatures(
  font?: Pick<FontFeatureConfig, 'openTypeFeatures' | 'ligatureFeatures'>,
  enableOpenTypeFeatures = true,
  enableLigatureFeatures = true
) {
  const features = [
    ...(enableOpenTypeFeatures ? (font?.openTypeFeatures ?? []) : []),
    ...(enableLigatureFeatures ? (font?.ligatureFeatures ?? []) : [])
  ].filter((feature, index, enabledFeatures) => {
    return enabledFeatures.indexOf(feature) === index;
  });

  return features
    .map((feature) => {
      const [featureName, featureValue] = feature.split('=');
      return featureValue
        ? `"${featureName}" ${featureValue}`
        : `"${featureName}"`;
    })
    .join(', ');
}

export function getFontDisplayName(
  font?: Pick<CodingFont, 'family' | 'displayName'>
) {
  return font?.displayName ?? font?.family ?? '';
}

export function getCssMonospaceFallback() {
  return 'ui-monospace, monospace';
}

export function getCssFontFamily(font?: Pick<CodingFont, 'family'>) {
  if (!font?.family) {
    return '';
  }

  if (font.family === 'ui-monospace') {
    return getCssMonospaceFallback();
  }

  const family = font.family.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `'${family}', ${getCssMonospaceFallback()}`;
}

export function getFontStyle(
  font?: FontFeatureConfig,
  enableOpenTypeFeatures = true,
  enableLigatureFeatures = true
) {
  const fontFeatures = getFontFeatures(
    font,
    enableOpenTypeFeatures,
    enableLigatureFeatures
  );
  return [
    font?.family ? `font-family: ${getCssFontFamily(font)}` : '',
    fontFeatures ? `font-feature-settings: ${fontFeatures}` : ''
  ]
    .filter(Boolean)
    .join('; ');
}
