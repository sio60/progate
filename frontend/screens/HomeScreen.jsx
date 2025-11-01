import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
} from 'react-native';

// 다국어 문구
const translations = {
  ko: {
    title: '오늘 뭐 먹지?',
    detail: '자세히 보기',
    time: '조리시간',
    level: '난이도',
    categories: ['🍲 국/찌개', '🥗 반찬', '🍙 밥/면', '🎎 명절요리'],
    langName: '한국어',
  },
  en: {
    title: "What's for today?",
    detail: 'View Recipe',
    time: 'Cooking time',
    level: 'Difficulty',
    categories: ['🍲 Soup/Stew', '🥗 Side dish', '🍙 Rice/Noodles', '🎎 Holiday food'],
    langName: 'English',
  },
  ja: {
    title: '今日何食べる？',
    detail: 'レシピを見る',
    time: '調理時間',
    level: '難易度',
    categories: ['🍲 スープ/鍋', '🥗 おかず', '🍙 ご飯/麺', '🎎 伝統料理'],
    langName: '日本語',
  },
};

export default function HomeScreen() {
  const [lang, setLang] = useState('ko'); // 현재 언어: 'ko' | 'en' | 'ja'
  const [showModal, setShowModal] = useState(false);

  const t = translations[lang];

  const randomRecipe = {
    name: {
      ko: '불고기',
      en: 'Bulgogi',
      ja: 'プルコギ',
    },
    time: '20분',
    level: '★★☆☆☆',
    image: 'https://www.foodsafetykorea.go.kr/uploadData/recipe/Q1/Q1_00024_img1.jpg',
  };

  return (
    <ScrollView style={styles.container}>
      {/* 설정 버튼 */}
      <TouchableOpacity
        style={styles.settingButton}
        onPress={() => setShowModal(true)}
      >
        <Text style={{ fontSize: 20 }}>⚙</Text>
      </TouchableOpacity>

      {/* 헤더 */}
      <Text style={styles.header}>{t.title}</Text>

      {/* 추천 레시피 카드 */}
      <View style={styles.card}>
        <Image source={{ uri: randomRecipe.image }} style={styles.cardImage} />
        <Text style={styles.recipeName}>{randomRecipe.name[lang]}</Text>
        <Text style={styles.recipeInfo}>
          {t.time}: {randomRecipe.time} | {t.level}: {randomRecipe.level}
        </Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>{t.detail}</Text>
        </TouchableOpacity>
      </View>

      {/* 카테고리 버튼 */}
      <View style={styles.categoryContainer}>
        {t.categories.map((label, idx) => (
          <TouchableOpacity key={idx} style={styles.categoryButton}>
            <Text style={styles.categoryText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 언어 설정 모달 */}
      <Modal visible={showModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowModal(false)}
          activeOpacity={1}
        >
          <View style={styles.modalContent}>
            {Object.keys(translations).map((code) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.langButton,
                  lang === code && styles.langButtonActive,
                ]}
                onPress={() => {
                  setLang(code);
                  setShowModal(false);
                }}
              >
                <Text style={styles.langText}>{translations[code].langName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fffceb',
  },
  settingButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20,
    color: '#444',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  recipeName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  recipeInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#ffc149',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#333',
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  categoryButton: {
    backgroundColor: '#ffe98a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    width: '48%',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
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
});
