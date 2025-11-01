import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions, FlatList } from 'react-native';
import HeaderLogo from '../components/HeaderLogo';
import { useGlobalLang } from '../components/GlobalLang';

const { width } = Dimensions.get('window');
const PAGE_W = width;
const ITEM_W = width - 40;

const translations = {
  ko: { title: '대표 한식', detail: '레시피 보기' },
  en: { title: 'Korean Dishes', detail: 'View Recipe' },
  ja: { title: '韓国料理おすすめ', detail: 'レシピを見る' },
};

const HEADER_SIZE = { ko: 31, en: 22, ja: 20 };
const RECIPE_NAME_SIZE = { ko: 35, en: 22, ja: 22 };
const CTA_SIZE = { ko: 30, en: 20, ja: 16 };

const foodList = [
  { key: 'bulgogi', image: require('../assets/food/bulgogi.png'), names: { ko: '불고기', en: 'Bulgogi', ja: 'プルコギ' } },
  { key: 'bibimbap', image: require('../assets/food/bibimbap.png'), names: { ko: '비빔밥', en: 'Bibimbap', ja: 'ビビンバ' } },
  { key: 'galbi', image: require('../assets/food/Galbi.png'), names: { ko: '갈비', en: 'Galbi', ja: 'カルビ' } },
  { key: 'gimbap', image: require('../assets/food/gimbap.png'), names: { ko: '김밥', en: 'Gimbap', ja: 'キンパ' } },
  { key: 'japchae', image: require('../assets/food/japchae.png'), names: { ko: '잡채', en: 'Japchae', ja: 'チャプチェ' } },
  { key: 'tteokbokki', image: require('../assets/food/Tteokbokki.png'), names: { ko: '떡볶이', en: 'Tteokbokki', ja: 'トッポッキ' } },
  { key: 'doenjang', image: require('../assets/food/DoenjangJjigae.png'), names: { ko: '된장찌개', en: 'Doenjang Jjigae', ja: 'テンジャンチゲ' } },
  { key: 'kimchi', image: require('../assets/food/KimchiJjigae.png'), names: { ko: '김치찌개', en: 'Kimchi Jjigae', ja: 'キムチチゲ' } },
];

export default function HomeScreen({ navigation }) {
  const { lang, font, footerH } = useGlobalLang();
  const t = useMemo(() => translations[lang], [lang]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleDetail = (food) => navigation.navigate('Recipe', { food });

  return (
    <View style={[styles.container, { paddingBottom: footerH }]}>
      <HeaderLogo />
      <Text style={[styles.header, { fontFamily: font, fontSize: HEADER_SIZE[lang], lineHeight: HEADER_SIZE[lang] * 1.1 }]}>
        {t.title}
      </Text>

      <View style={styles.hero}>
        <FlatList
          key={lang}
          data={foodList}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / PAGE_W);
            setCurrentSlide(index);
          }}
          renderItem={({ item }) => (
            <View style={styles.slideWrapper}>
              <ImageBackground source={item.image} style={styles.slideImage} imageStyle={styles.imageBg}>
                <Text
                  style={[
                    styles.recipeName,
                    { fontFamily: font, fontSize: RECIPE_NAME_SIZE[lang], lineHeight: RECIPE_NAME_SIZE[lang] * 1.1 },
                  ]}
                >
                  {item.names[lang]}
                </Text>

                <TouchableOpacity style={styles.ctaRow} onPress={() => handleDetail(item)}>
                  <Text style={[styles.buttonText, { fontFamily: font, fontSize: CTA_SIZE[lang], lineHeight: CTA_SIZE[lang] * 1.15 }]}>
                    {t.detail}
                  </Text>
                  <Text style={[styles.arrowText, { fontSize: CTA_SIZE[lang], lineHeight: CTA_SIZE[lang] * 1.15 }]}>→</Text>
                </TouchableOpacity>
              </ImageBackground>
            </View>
          )}
        />
        <View style={styles.barContainer}>
          {foodList.map((_, i) => (
            <View key={i} style={[styles.bar, currentSlide === i && styles.barActive]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 8 },
  header: { color: '#333', textAlign: 'left', alignSelf: 'flex-start', marginLeft: 20, marginBottom: 8, includeFontPadding: false },
  hero: { paddingHorizontal: 0 },
  slideWrapper: { width: ITEM_W, height: 460, marginHorizontal: 20, marginTop: -8 },
  slideImage: { flex: 1, justifyContent: 'space-between', paddingVertical: 20, paddingHorizontal: 16 },
  imageBg: { resizeMode: 'cover', borderRadius: 0 },
  recipeName: { color: '#000', alignSelf: 'flex-end', marginRight: 4, marginTop: 2, includeFontPadding: false },
  ctaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center' },
  buttonText: { color: '#000', includeFontPadding: false },
  arrowText: { marginLeft: 8, color: '#000' },
  barContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 6, marginBottom: 8, gap: 6, paddingHorizontal: 20 },
  bar: { width: 20, height: 3, backgroundColor: '#e0e0e0', borderRadius: 2 },
  barActive: { backgroundColor: '#f4a300' },
});
