import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';

const { width } = Dimensions.get('window');

const translations = {
  ko: {
    title: '대표 한식 추천',
    detail: '자세히 보기',
    langName: '한국어',
    font: 'Unheo',
  },
  en: {
    title: 'Korean Dishes',
    detail: 'View Recipe',
    langName: 'English',
    font: 'Tegomin',
  },
  ja: {
    title: '韓国料理おすすめ',
    detail: 'レシピを見る',
    langName: '日本語',
    font: 'Brush',
  },
};

const foodList = [
  { name: '불고기', image: require('../assets/food/bulgogi.png') },
  { name: '비빔밥', image: require('../assets/food/bibimbap.png') },
  { name: '갈비', image: require('../assets/food/Galbi.png') },
  { name: '김밥', image: require('../assets/food/gimbap.png') },
  { name: '잡채', image: require('../assets/food/japchae.png') },
  { name: '떡볶이', image: require('../assets/food/Tteokbokki.png') },
  { name: '된장찌개', image: require('../assets/food/DoenjangJjigae.png') },
  { name: '김치찌개', image: require('../assets/food/KimchiJjigae.png') },
];

export default function HomeScreen() {
  const [lang, setLang] = useState('ko');
  const [showModal, setShowModal] = useState(false);
  const t = translations[lang];

  const handleDetail = (foodName) => {
    console.log('자세히 보기:', foodName);
    // TODO: 레시피 상세 페이지 연결
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { fontFamily: t.font }]}>{t.title}</Text>

      <FlatList
        data={foodList}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.slideCard}>
            <Image source={item.image} style={styles.slideImage} />
            <Text style={[styles.recipeName, { fontFamily: t.font }]}>{item.name}</Text>
            <TouchableOpacity style={styles.button} onPress={() => handleDetail(item.name)}>
              <Text style={styles.buttonText}>{t.detail}</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* 언어 선택 모달 */}
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
                <Text style={[styles.langText, { fontFamily: translations[code].font }]}> {translations[code].langName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 하단 메뉴 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerIcon}>
          <Image source={require('../assets/icons/recipe.png')} style={styles.iconImg} />
          <Text style={[styles.footerText, { fontFamily: t.font }]}>재료 입력</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerIcon}>
          <Image source={require('../assets/icons/search.png')} style={styles.iconImg} />
          <Text style={[styles.footerText, { fontFamily: t.font }]}>레시피 검색</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerIcon}>
          <Image source={require('../assets/icons/watch.png')} style={styles.iconImg} />
          <Text style={[styles.footerText, { fontFamily: t.font }]}>한식 둘러보기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerIcon} onPress={() => setShowModal(true)}>
          <Image source={require('../assets/icons/set.png')} style={styles.iconImg} />
          <Text style={[styles.footerText, { fontFamily: t.font }]}>설정</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginLeft: 20,
    marginBottom: 20,
    color: '#333',
  },
  slideCard: {
    width: width - 60,
    marginHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  slideImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  recipeName: {
    fontSize: 20,
    marginBottom: 10,
    color: '#222',
  },
  button: {
    backgroundColor: '#ffc149',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#333',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: 240,
  },
  langButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  langButtonActive: {
    backgroundColor: '#ffe98a',
    borderRadius: 8,
  },
  langText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 30 : 10,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
  },
  footerIcon: {
    flex: 1,
    alignItems: 'center',
  },
  iconImg: {
    width: 24,
    height: 24,
    marginBottom: 4,
    resizeMode: 'contain',
  },
  footerText: {
    fontSize: 12,
    color: '#333',
  },
});