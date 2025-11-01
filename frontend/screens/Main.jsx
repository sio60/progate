import React, { useState } from 'react';
import {
  View, Image, Text, StyleSheet,
  TouchableOpacity, Dimensions, Modal
} from 'react-native';

const { width, height } = Dimensions.get('window');

const languageText = {
  ko: '레시피 받기',
  en: 'Get Recipe',
  jp: 'レシピをもらう',
};

const fontMap = {
  ko: 'Unheo',
  en: 'Brush',
  jp: 'Tegomin',
};

export default function Main({ navigation }) {
  const [lang, setLang] = useState('ko');
  const [modalVisible, setModalVisible] = useState(false);

  const handleStart = () => {
    navigation.navigate('Home');
  };

  const changeLanguage = (selected) => {
    setLang(selected);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/slide/slide3.png')}
        style={styles.background}
        blurRadius={2}
      />

      <TouchableOpacity style={styles.settingBtn} onPress={() => setModalVisible(true)}>
        <Image
          source={require('../assets/icons/setting.png')}
          style={{ width: 24, height: 24 }}
        />
      </TouchableOpacity>

      <View style={styles.center}>
        <Image
          source={require('../assets/icons/main.png')}
          style={styles.logo}
        />
        <TouchableOpacity style={styles.button} onPress={handleStart}>
          <Text style={[styles.buttonText, { fontFamily: fontMap[lang] }]}>
            {languageText[lang]}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={[styles.modalTitle, { fontFamily: fontMap[lang] }]}>언어 선택</Text>
            <TouchableOpacity onPress={() => changeLanguage('ko')}>
              <Text style={[styles.modalOption, { fontFamily: 'Unheo' }]}>한국어</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeLanguage('en')}>
              <Text style={[styles.modalOption, { fontFamily: 'Brush' }]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeLanguage('jp')}>
              <Text style={[styles.modalOption, { fontFamily: 'Tegomin' }]}>日本語</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  background: {
    width,
    height,
    position: 'absolute',
    resizeMode: 'cover',
  },
  settingBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  logo: {
    width: width * 1,
    height: width * 0.9,
    resizeMode: 'contain',
    marginBottom: 40,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 40,
    color: '#4b371f',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  modalOption: {
    fontSize: 16,
    marginVertical: 8,
    color: '#333',
  },
});
