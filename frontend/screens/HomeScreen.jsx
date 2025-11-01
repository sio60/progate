import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  Modal,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';
import { useFonts } from 'expo-font';

const { width } = Dimensions.get('window');

const translations = {
  ko: {
    title: '대표 한식 추천',
    detail: '레시피 보기',
    langName: '한국어',
    font: 'Unheo',
    navIngredients: '재료 입력',
    navSearch: '레시피 검색',
    navBrowse: '한식 둘러보기',
    navSettings: '설정',
  },
  en: {
    title: 'Korean Dishes',
    detail: 'View Recipe',
    langName: 'English',
    font: 'Tegomin',
    navIngredients: 'Add Ingredients',
    navSearch: 'Search Recipes',
    navBrowse: 'Browse Korean Food',
    navSettings: 'Settings',
  },
  ja: {
    title: '韓国料理おすすめ',
    detail: 'レシピを見る',
    langName: '日本語',
    font: 'Brush',
    navIngredients: '材料入力',
    navSearch: 'レシピ検索',
    navBrowse: '韓国料理を見る',
    navSettings: '設定',
  },
};

const HEADER_SIZE = { ko: 31, en: 22, ja: 22 };
const FOOTER_FONT = { ko: 12, en: 10, ja: 10 };
const RECIPE_NAME_SIZE = { ko: 26, en: 22, ja: 22 }; // ← 한글만 더 크게
const CTA_SIZE = { ko: 18, en: 16, ja: 16 };

const foodList = [
  {
    key: 'bulgogi',
    image: require('../assets/food/bulgogi.png'),
    names: { ko: '불고기', en: 'Bulgogi', ja: 'プルコギ' },
  },
  {
    key: 'bibimbap',
    image: require('../assets/food/bibimbap.png'),
    names: { ko: '비빔밥', en: 'Bibimbap', ja: 'ビビンバ' },
  },
  {
    key: 'galbi',
    image: require('../assets/food/Galbi.png'),
    names: { ko: '갈비', en: 'Galbi', ja: 'カルビ' },
  },
  {
    key: 'gimbap',
    image: require('../assets/food/gimbap.png'),
    names: { ko: '김밥', en: 'Gimbap', ja: 'キンパ' },
  },
  {
    key: 'japchae',
    image: require('../assets/food/japchae.png'),
    names: { ko: '잡채', en: 'Japchae', ja: 'チャプチェ' },
  },
  {
    key: 'tteokbokki',
    image: require('../assets/food/Tteokbokki.png'),
    names: { ko: '떡볶이', en: 'Tteokbokki', ja: 'トッポッキ' },
  },
  {
    key: 'doenjang',
    image: require('../assets/food/DoenjangJjigae.png'),
    names: { ko: '된장찌개', en: 'Doenjang Jjigae', ja: 'テンジャンチゲ' },
  },
  {
    key: 'kimchi',
    image: require('../assets/food/KimchiJjigae.png'),
    names: { ko: '김치찌개', en: 'Kimchi Jjigae', ja: 'キムチチゲ' },
  },
];

export default function HomeScreen() {
  const [lang, setLang] = useState('ko');
  const [showModal, setShowModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const t = useMemo(() => translations[lang], [lang]);

  const [fontsLoaded] = useFonts({
    Unheo: require('../assets/font/NYJUnheo.ttf'),
    Tegomin: require('../assets/font/NewTegomin-Regular.ttf'),
    Brush: require('../assets/font/NanumBrushScript-Regular.ttf'),
  });
  if (!fontsLoaded) return null;

  const handleDetail = (foodName) => {
    console.log('자세히 보기:', foodName);
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoWrapper}>
        <Image source={require('../assets/icons/home.png')} style={styles.logo} />
      </View>

      <Text style={[styles.header, { fontFamily: t.font, fontSize: HEADER_SIZE[lang] }]}>
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
            const index = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
            setCurrentSlide(index);
          }}
          renderItem={({ item }) => (
            <View style={styles.slideWrapper}>
              <ImageBackground
                source={item.image}
                style={styles.slideImage}
                imageStyle={{ resizeMode: 'cover', borderRadius: 12 }}
              >
                {/* 음식 이름: 오른쪽 상단, 언어별 크기 */}
                <Text
                  style={[
                    styles.recipeName,
                    { fontFamily: t.font, fontSize: RECIPE_NAME_SIZE[lang] },
                  ]}
                >
                  {item.names[lang]}
                </Text>

                {/* 레시피 보기: 배경 없음 + 언어별 크기 */}
                <TouchableOpacity style={styles.ctaRow} onPress={() => handleDetail(item.names[lang])}>
                  <Text
                    style={[
                      styles.buttonText,
                      { fontFamily: t.font, fontSize: CTA_SIZE[lang] },
                    ]}
                  >
                    {t.detail}
                  </Text>
                  <Text style={[styles.arrowText, { fontSize: CTA_SIZE[lang] }]}>→</Text>
                </TouchableOpacity>
              </ImageBackground>
            </View>
          )}
        />

        {/* 인디케이터 */}
        <View style={styles.barContainer}>
          {foodList.map((_, i) => (
            <View key={i} style={[styles.bar, currentSlide === i && styles.barActive]} />
          ))}
        </View>
      </View>

      {/* 하단 메뉴 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerIcon}>
          <Image source={require('../assets/icons/recipe.png')} style={styles.iconImg} />
          <Text style={[styles.footerText, { fontFamily: t.font, fontSize: FOOTER_FONT[lang] }]} numberOfLines={2} ellipsizeMode="tail">
            {t.navIngredients}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerIcon}>
          <Image source={require('../assets/icons/search.png')} style={styles.iconImg} />
          <Text style={[styles.footerText, { fontFamily: t.font, fontSize: FOOTER_FONT[lang] }]} numberOfLines={2} ellipsizeMode="tail">
            {t.navSearch}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerIcon}>
          <Image source={require('../assets/icons/watch.png')} style={styles.iconImg} />
          <Text style={[styles.footerText, { fontFamily: t.font, fontSize: FOOTER_FONT[lang] }]} numberOfLines={2} ellipsizeMode="tail">
            {t.navBrowse}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerIcon} onPress={() => setShowModal(true)}>
          <Image source={require('../assets/icons/set.png')} style={styles.iconImg} />
          <Text style={[styles.footerText, { fontFamily: t.font, fontSize: FOOTER_FONT[lang] }]} numberOfLines={2} ellipsizeMode="tail">
            {t.navSettings}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 언어 설정 모달 */}
      <Modal visible={showModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowModal(false)} activeOpacity={1}>
          <View style={styles.modalContent}>
            {Object.keys(translations).map((code) => (
              <TouchableOpacity
                key={code}
                style={[styles.langButton, lang === code && styles.langButtonActive]}
                onPress={() => {
                  setLang(code);
                  setShowModal(false);
                }}
              >
                <Text style={[styles.langText, { fontFamily: translations[code].font }]}>
                  {translations[code].langName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const COL_WIDTH = Math.floor((width - 32) / 4);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 8 },
  logoWrapper: { alignItems: 'center', marginBottom: 2, marginTop: -10 },
  logo: { width: 120, height: 120, resizeMode: 'contain' },

  header: {
    color: '#333',
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 8,
    includeFontPadding: false,
  },

  hero: { paddingHorizontal: 0 },
  slideWrapper: {
    width: width - 40,
    height: 460,
    marginHorizontal: 20,
    marginTop: -8,
  },
  slideImage: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },

  /* 음식 이름: 오른쪽 상단 */
  recipeName: {
    color: '#000',
    alignSelf: 'flex-end',
    marginRight: 4,
    marginTop: 2,
    includeFontPadding: false,
  },

  /* CTA */
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  buttonText: {
    color: '#000',
    includeFontPadding: false,
  },
  arrowText: {
    marginLeft: 8,
    color: '#000',
    lineHeight: 20,
  },

  /* 인디케이터 */
  barContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
    gap: 6,
    paddingHorizontal: 20,
  },
  bar: {
    width: 20,
    height: 3,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  barActive: { backgroundColor: '#f4a300' },

  /* 하단 메뉴 */
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    marginBottom: Platform.OS === 'android' ? 16 : 8,
  },
  footerIcon: {
    alignItems: 'center',
    width: COL_WIDTH,
    paddingHorizontal: 4,
  },
  iconImg: { width: 24, height: 24, marginBottom: 4, resizeMode: 'contain' },
  footerText: { color: '#333', textAlign: 'center', lineHeight: 14 },

  /* 모달 */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 12, width: 240 },
  langButton: { paddingVertical: 12, alignItems: 'center' },
  langButtonActive: { backgroundColor: '#ffe98a', borderRadius: 8 },
  langText: { fontSize: 16 },
});
