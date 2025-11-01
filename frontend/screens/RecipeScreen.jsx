import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ImageBackground, ScrollView, TouchableOpacity } from 'react-native';
import HeaderLogo from '../components/HeaderLogo';
import { useGlobalLang } from '../components/GlobalLang';
import recipes from '../data/recipes';

const tMap = {
  ko: { ingredients: '재료', steps: '조리 과정', listen: '음성으로 듣기' },
  en: { ingredients: 'Ingredients', steps: 'Steps', listen: 'Listen (TTS)' },
  ja: { ingredients: '材料', steps: '作り方', listen: '音声で聞く' },
};

const NAME_SIZE = { ko: 35, en: 22, ja: 22 };

export default function RecipeScreen({ route, navigation }) {
  const { food } = route.params || {};
  const { lang, font, footerH } = useGlobalLang();
  const t = useMemo(() => tMap[lang], [lang]);
  const titleSize = NAME_SIZE[lang] || 28;

  const r = recipes[food?.key];
  const ings = r?.[lang]?.ingredients ?? [];
  const steps = r?.[lang]?.steps ?? [];

  return (
    <View style={[styles.container, { paddingBottom: footerH }]}>
      <HeaderLogo />
      <ImageBackground source={food?.image} style={styles.cover} imageStyle={{ resizeMode: 'cover' }}>
        <TouchableOpacity
          style={styles.listenBtn}
          onPress={() => navigation.navigate('TTS', { food })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.listenText, { fontFamily: font }]}>{t.listen} →</Text>
        </TouchableOpacity>

        <Text
          style={[
            styles.foodName,
            { fontFamily: font, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.1) },
          ]}
        >
          {food?.names?.[lang] ?? ''}
        </Text>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{t.ingredients}</Text>
        {ings.map((it, i) => (
          <Text key={`i-${i}`} style={styles.p}>- {it}</Text>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t.steps}</Text>
        {steps.map((s, i) => (
          <Text key={`s-${i}`} style={styles.p}>{i + 1}) {s}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 8 },
  cover: { width: '100%', height: 320, justifyContent: 'flex-start' },
  listenBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    zIndex: 2,
  },
  listenText: { fontSize: 14, color: '#111' },
  foodName: {
    color: '#000',
    paddingTop: 10,
    paddingHorizontal: 14,
    includeFontPadding: false,
    width: '100%',
    textAlign: 'right',
  },
  body: { paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#222' },
  p: { fontSize: 15, color: '#444', marginTop: 6, lineHeight: 22 },
});
