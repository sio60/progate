import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useGlobalLang } from '../components/GlobalLang';
import recipes from '../data/recipes';
import TtsPlayer from '../components/TtsPlayer';

const tMap = {
  ko: { ingredients: '재료', steps: '조리 과정' },
  en: { ingredients: 'Ingredients', steps: 'Steps' },
  ja: { ingredients: '材料', steps: '作り方' },
};

export default function TtsScreen({ route }) {
  const { food } = route.params || {};
  const { lang } = useGlobalLang();
  const t = useMemo(() => tMap[lang], [lang]);

  const r = recipes[food?.key];
  const ings = r?.[lang]?.ingredients ?? [];
  const steps = r?.[lang]?.steps ?? [];

  const lines = useMemo(() => {
    const name = food?.names?.[lang] ?? '';
    const headIngs = t.ingredients;
    const headSteps = t.steps;
    const stepLines = steps.map((s, i) => `${i + 1}) ${s}`);
    return [name, headIngs, ...ings, headSteps, ...stepLines];
  }, [food, lang]);

  return (
    <View style={styles.container}>
      <TtsPlayer lines={lines} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
